import { useRef, useState } from 'react';
import { Typography, theme } from 'antd';
import type { CSSProperties } from 'react';
import '../../components/exams/ExamForm.css';
import '../../components/shared/Toast.css';
import { ExamForm } from '../../components/exams/ExamForm';
import type { ExamFormHandle } from '../../components/exams/ExamForm';
import { Toast, useToast } from '../../components/shared/Toast';
import { readJSON } from '../../services/storage/localStorage';
import PageTemplate from '../../components/PageTemplate';
import './ExamCreatePage.css';
import { generateQuestions, type GeneratedQuestion } from '../../services/exams.service';
import AiResults from './AiResults';

const { Title } = Typography;

const layoutStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 30,
  alignItems: 'center',
  padding: 'clamp(24px, 3.2vw, 40px) 16px',
};

const TEXT_KEYS = ['text', 'statement', 'question', 'prompt', 'enunciado', 'descripcion', 'description', 'body', 'content'];
const OPT_KEYS = ['options', 'choices', 'alternativas', 'opciones', 'answers'];
const pickTextLike = (q: any) => {
  for (const k of TEXT_KEYS) {
    const v = q?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};
const pickOptionsLike = (q: any) => {
  for (const k of OPT_KEYS) {
    const v = q?.[k];
    if (Array.isArray(v) && v.length) return v.map(String);
  }
  return undefined;

};

function normalizeToQuestions(res: any): GeneratedQuestion[] {
  if (Array.isArray(res)) return res as GeneratedQuestion[];
  const buckets = res?.data?.questions;
  if (res?.ok && buckets && typeof buckets === 'object') {
    const types = ['multiple_choice', 'true_false', 'open_analysis', 'open_exercise'] as const;
    const out: GeneratedQuestion[] = [];
    types.forEach((t) => {
      const arr = (buckets as any)[t] || [];
      arr.forEach((q: any, idx: number) => {
        out.push({
          id: q.id ?? `${t}_${idx}_${Date.now()}`,
          type: t,
          text: pickTextLike(q),
          options: pickOptionsLike(q),
          include: q.include ?? true,
        } as GeneratedQuestion);
      });
    });
    return out;
  }
  return [];
}

export default function ExamsCreatePage() {
  const { token } = theme.useToken();
  const { toasts, pushToast, removeToast } = useToast();
  const formRef = useRef<ExamFormHandle>(null!);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = useState<GeneratedQuestion[]>([]);
  const [aiMeta, setAiMeta] = useState<{ subject: string; difficulty: string; reference?: string }>({
    subject: 'Tema general',
    difficulty: 'medio',
    reference: '',
  });

  const cardStyle: CSSProperties = {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  const buildAiInputFromForm = (raw: Record<string, any>) => {
    const difficultyMap: Record<string, 'fácil' | 'medio' | 'difícil'> = {
      facil: 'fácil', 'fácil': 'fácil', easy: 'fácil',
      medio: 'medio', media: 'medio', medium: 'medio',
      dificil: 'difícil', 'difícil': 'difícil', hard: 'difícil',
    };
    const difficultyKey = String(raw.difficulty ?? 'medio').toLowerCase();
    const difficulty = difficultyMap[difficultyKey] ?? 'medio';
    const distribution = {
      multiple_choice: Number(raw.multipleChoice ?? 0) || 0,
      true_false: Number(raw.trueFalse ?? 0) || 0,
      open_analysis: Number(raw.analysis ?? 0) || 0,
      open_exercise: Number(raw.openEnded ?? 0) || 0,
    };
    const totalQuestions =
      distribution.multiple_choice +
      distribution.true_false +
      distribution.open_analysis +
      distribution.open_exercise;

    return {
      subject: raw.subject ?? raw.topic ?? 'Tema general',
      difficulty,
      totalQuestions,
      reference: raw.reference ?? '',
      distribution,
      language: 'es',
    };
  };

  const handleAIPropose = async () => {
    const snap = formRef.current?.getSnapshot?.();
    const draft = readJSON('exam:draft');
    const data = snap?.values?.subject ? snap.values : draft;

    if (!data) {
      pushToast('Completa y guarda el formulario primero.', 'warn');
      return;
    }

    setAiMeta({
      subject: data.subject ?? 'Tema general',
      difficulty: data.difficulty ?? 'medio',
      reference: data.reference ?? '',
    });

    const dto = buildAiInputFromForm(data);
    if (dto.totalQuestions <= 0) {
      setAiOpen(true);
      setAiQuestions([]);
      setAiError('La suma de la distribución debe ser al menos 1.');
      return;
    }

    setAiOpen(true);
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await generateQuestions(dto as any);
      const list = normalizeToQuestions(res);
      setAiQuestions(list);
      if (!list.length) {
        setAiError('No se generaron preguntas. Revisa el backend y/o el DTO.');
      }
    } catch {
      setAiError('Error inesperado generando preguntas.');
    } finally {
      setAiLoading(false);
    }
  };

  const onChangeQuestion = (q: GeneratedQuestion) => {
    setAiQuestions((prev) => prev.map((x) => (x.id === q.id ? q : x)));
  };

  const onRegenerateAll = async () => {
    const snap = formRef.current?.getSnapshot?.();
    const data = snap?.values ?? {};
    const dto = buildAiInputFromForm(data);

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await generateQuestions(dto as any);
      const list = normalizeToQuestions(res);
      setAiQuestions(list);
      if (!list.length) setAiError('No se pudieron regenerar preguntas.');
    } catch {
      setAiError('No se pudo regenerar el set completo.');
    } finally {
      setAiLoading(false);
    }
  };

  const onRegenerateOne = async (q: GeneratedQuestion) => {
    const snap = formRef.current?.getSnapshot?.();
    const data = snap?.values ?? {};
    const base = buildAiInputFromForm(data);
    const oneDto = {
      ...base,
      totalQuestions: 1,
      distribution: {
        multiple_choice: q.type === 'multiple_choice' ? 1 : 0,
        true_false: q.type === 'true_false' ? 1 : 0,
        open_analysis: q.type === 'open_analysis' ? 1 : 0,
        open_exercise: q.type === 'open_exercise' ? 1 : 0,
      },
    };
    try {
      const res = await generateQuestions(oneDto as any);
      const [only] = normalizeToQuestions(res);
      if (only) {
        setAiQuestions((prev) =>
          prev.map((x) => (x.id === q.id ? { ...only, id: q.id, include: q.include } : x))
        );
      }
    } catch {
      setAiError('No se pudo regenerar esa pregunta.');
    }
  };

  const onAddManual = (type: GeneratedQuestion['type']) => {
    const id = `manual_${Date.now()}`;
    if (type === 'multiple_choice') {
      setAiQuestions((prev) => ([
        ...prev,
        { id, type, text: 'Escribe aquí tu pregunta de opción múltiple…', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], include: true } as GeneratedQuestion,
      ]));
    } else if (type === 'true_false') {
      setAiQuestions((prev) => ([
        ...prev,
        { id, type, text: 'Enuncia aquí tu afirmación para Verdadero/Falso…', include: true } as GeneratedQuestion,
      ]));
    } else if (type === 'open_exercise') {
      setAiQuestions((prev) => ([
        ...prev,
        { id, type, text: 'Describe aquí el enunciado del ejercicio abierto…', include: true } as GeneratedQuestion,
      ]));
    } else {
      setAiQuestions((prev) => ([
        ...prev,
        { id, type, text: 'Escribe aquí tu consigna de análisis abierto…', include: true } as GeneratedQuestion,
      ]));
    }
  };

  const onSave = async () => {
    const selected = aiQuestions.filter((q) => q.include).length;
    pushToast(`Cambios guardados. Preguntas incluidas: ${selected}.`, 'success');
  };

  return (
    <PageTemplate
      title="Exámenes"
      subtitle="Creador de exámenes"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Exámenes', href: '/exams' }, { label: 'Crear', href: '/exams/create' },{ label: 'Gestión de Exámenes',href: '/exams'}]}
    >
      <div
        className="pantalla-scroll w-full lg:max-w-6xl lg:mx-auto space-y-4 sm:space-y-6"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 30px', background: token.colorBgLayout, color: token.colorText }}
      >
        <section className="card" style={{ ...cardStyle, maxWidth: 'clamp(720px, 92vw, 1000px)',margin: '0 auto' }}>
          <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>Crear nuevo examen</Title>
          <div style={layoutStyle}>
            <ExamForm ref={formRef} onToast={pushToast} onGenerateAI={handleAIPropose} />
          </div>
        </section>

        {aiOpen && (
          <section className="card" style={{ ...cardStyle, width: '100%', maxWidth: 1000, margin: '0 auto' }}>
            <AiResults
              subject={aiMeta.subject}
              difficulty={aiMeta.difficulty}
              createdAt={new Date().toLocaleDateString('es-ES')}
              questions={aiQuestions}
              loading={aiLoading}
              error={aiError}
              onChange={onChangeQuestion}
              onRegenerateAll={onRegenerateAll}
              onRegenerateOne={onRegenerateOne}
              onAddManual={onAddManual}
              onSave={onSave}
              onReorder={function (_from: number, _to: number): void {
                throw new Error('Function not implemented.');
              }}
            />
          </section>
        )}

        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </PageTemplate>
  );
}
