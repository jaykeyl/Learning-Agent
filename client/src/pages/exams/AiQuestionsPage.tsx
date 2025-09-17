import { useRef, useState, type CSSProperties } from 'react';
import { Button, Typography, theme } from 'antd';
import '../../components/exams/ExamForm.css';
import '../../components/shared/Toast.css';
import { ExamForm } from '../../components/exams/ExamForm';
import type { ExamFormHandle } from '../../components/exams/ExamForm';
import { Toast, useToast } from '../../components/shared/Toast';
import { readJSON } from '../../services/storage/localStorage';
import PageTemplate from '../../components/PageTemplate';
import { generateQuestions, type GeneratedQuestion } from '../../services/exams.service';
import './ExamCreatePage.css';
import AiResults from './AiResults';
import {
  normalizeToQuestions,
  cloneQuestion,
  reorderQuestions,
  ensureUniqueIds,
} from './ai-utils';
import { isValidGeneratedQuestion } from '../../utils/aiValidation';

const { Title } = Typography;

async function repairInvalidQuestions(
  list: GeneratedQuestion[],
  baseDto: any,
  generateFn: (dto: any) => Promise<any>,
): Promise<GeneratedQuestion[]> {
  const fixed = [...list];
  for (let i = 0; i < fixed.length; i++) {
    const q = fixed[i];
    if (isValidGeneratedQuestion(q)) continue;

    const distribution = {
      multiple_choice: q.type === 'multiple_choice' ? 1 : 0,
      true_false: q.type === 'true_false' ? 1 : 0,
      open_analysis: q.type === 'open_analysis' ? 1 : 0,
      open_exercise: q.type === 'open_exercise' ? 1 : 0,
    };
    const oneDto = { ...baseDto, totalQuestions: 1, distribution };

    let replacement: GeneratedQuestion | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await generateFn(oneDto);
        const [candidate] = normalizeToQuestions(res);
        if (candidate && isValidGeneratedQuestion(candidate)) {
          replacement = candidate;
          break;
        }
      } catch {}
    }
    if (replacement) {
      fixed[i] = { ...replacement, id: q.id, include: q.include };
    }
  }
  return fixed;
}

export default function (): JSX.Element {
  const { toasts, pushToast, removeToast } = useToast();
  const formRef = useRef<ExamFormHandle>(null!);
  const { token } = theme.useToken();

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = useState<GeneratedQuestion[]>([]);
  const [aiMeta, setAiMeta] = useState<{ subject: string; difficulty: string; reference?: string }>({
    subject: 'Tema general',
    difficulty: 'medio',
    reference: '',
  });

  const cssVars: CSSProperties = {
    ['--app-colorBgContainer' as any]: token.colorBgContainer,
    ['--app-colorBgElevated' as any]: token.colorBgElevated,
    ['--app-colorBorder' as any]: token.colorBorder,
    ['--app-colorBorderSecondary' as any]: token.colorBorderSecondary,
    ['--app-colorText' as any]: token.colorText,
    ['--app-colorTextSecondary' as any]: token.colorTextSecondary,
    ['--app-colorPrimary' as any]: token.colorPrimary,
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
      reference:
        Array.isArray((raw as any).indices) && (raw as any).indices.length > 0
          ? `Índices: ${((raw as any).indices as string[]).join(' | ')}`
          : raw.reference ?? '',
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
      reference:
        Array.isArray((data as any).indices) && (data as any).indices.length > 0
          ? `Índices: ${((data as any).indices as string[]).join(' | ')}`
          : data.reference ?? '',
    });
    setAiOpen(true);
    setAiLoading(true);
    setAiError(null);

    try {
      const dto = buildAiInputFromForm(data);
      const res = await generateQuestions(dto as any);
      const list = ensureUniqueIds(normalizeToQuestions(res).map(cloneQuestion));
      const fixed = await repairInvalidQuestions(list, dto, (p) => generateQuestions(p as any));
      setAiQuestions(fixed);
      if (!fixed.length) setAiError('No se pudieron regenerar preguntas.');
    } catch {
      setAiError('No se pudo regenerar el set completo.');
    } finally {
      setAiLoading(false);
    }
  };

  const onRegenerateAll = async () => {
    const snap = formRef.current?.getSnapshot?.();
    const data = snap?.values ?? {};
    setAiLoading(true);
    setAiError(null);
    try {
      const dto = buildAiInputFromForm(data);
      const res = await generateQuestions(dto as any);
      const list = ensureUniqueIds(normalizeToQuestions(res).map(cloneQuestion));
      const fixed = await repairInvalidQuestions(list, dto, (p) => generateQuestions(p as any));
      setAiQuestions(fixed);
      if (!fixed.length) setAiError('No se pudieron regenerar preguntas.');
    } catch {
      setAiError('No se pudo regenerar el set completo.');
    } finally {
      setAiLoading(false);
    }
  };

  const onRegenerateOne = async (q: GeneratedQuestion) => {
    if (q.id?.startsWith('manual_')) return;

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
      let only: GeneratedQuestion | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await generateQuestions(oneDto as any);
        const [candidate] = normalizeToQuestions(res);
        if (candidate && isValidGeneratedQuestion(candidate)) {
          only = candidate;
          break;
        }
      }
      if (only) {
        setAiQuestions((prev) =>
          prev.map((x) => (x.id === q.id ? { ...only, id: q.id, include: q.include } : x)),
        );
      } else {
        setAiError('No se pudo regenerar esa pregunta (intentos agotados).');
      }
    } catch {
      setAiError('No se pudo regenerar esa pregunta.');
    }
  };

  const onAddManual = (type: GeneratedQuestion['type']) => {
    const id = `manual_${Date.now()}`;
    if (type === 'multiple_choice') {
      setAiQuestions((prev) => [
        ...prev,
        cloneQuestion({
          id,
          type,
          text: 'Escribe aquí el enunciado de la pregunta de opción múltiple…',
          options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          include: true,
        } as GeneratedQuestion),
      ]);
    } else if (type === 'true_false') {
      setAiQuestions((prev) => [
        ...prev,
        cloneQuestion({
          id,
          type,
          text: 'Enuncia aquí tu afirmación para Verdadero/Falso…',
          include: true,
        } as GeneratedQuestion),
      ]);
    } else if (type === 'open_exercise') {
      setAiQuestions((prev) => [
        ...prev,
        cloneQuestion({
          id,
          type,
          text: 'Describe aquí el enunciado del ejercicio abierto…',
          include: true,
        } as GeneratedQuestion),
      ]);
    } else {
      setAiQuestions((prev) => [
        ...prev,
        cloneQuestion({
          id,
          type,
          text: 'Escribe aquí tu consigna de análisis abierto…',
          include: true,
        } as GeneratedQuestion),
      ]);
    }
  };

  const onSave = async () => {
    const selected = aiQuestions.filter((x) => x.include).length;
    pushToast(`Cambios guardados. Preguntas incluidas: ${selected}.`, 'success');
  };

  return (
    <PageTemplate
      title="Exámenes"
      subtitle="Creador de exámenes"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Exámenes', href: '/exams' },
        { label: 'Crear', href: '/exams/create' },
        { label: 'Gestión de Exámenes', href: '/exams' },
      ]}
    >
      <div
        className="pantalla-scroll w-full lg:max-w-6xl lg:mx-auto space-y-4 sm:space-y-6"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '30px 30px',
          background: token.colorBgLayout,
          color: token.colorText,
        }}
      >
        {!aiOpen && (
          <section
            className="card"
            style={{
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowSecondary,
              maxWidth: 'clamp(720px, 92vw, 1000px)',
              margin: '0 auto',
              ...cssVars,
            }}
          >
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
              Crear nuevo examen
            </Title>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 30,
                alignItems: 'center',
                padding: 'clamp(24px, 3.2vw, 40px) 16px',
              }}
            >
              <ExamForm ref={formRef} onToast={pushToast} onGenerateAI={handleAIPropose} />
            </div>
          </section>
        )}

        {aiOpen && (
          <div className="flex justify-end mb-2">
            <Button type="link" onClick={() => setAiOpen(false)}>
              Editar configuración
            </Button>
          </div>
        )}

        {aiOpen && (
          <section className="card subtle readable-card" aria-label="Preguntas propuestas por IA">
            <AiResults
              subject={aiMeta.subject}
              difficulty={aiMeta.difficulty}
              createdAt={new Date().toLocaleDateString('es-ES')}
              reference={aiMeta.reference}
              questions={aiQuestions}
              loading={aiLoading}
              error={aiError}
              onChange={(q) =>
                setAiQuestions((prev) => prev.map((x) => (x.id === q.id ? q : x)))
              }
              onRegenerateAll={onRegenerateAll}
              onRegenerateOne={onRegenerateOne}
              onAddManual={onAddManual}
              onSave={onSave}
              onReorder={(from, to) => setAiQuestions((prev) => reorderQuestions(prev, from, to))}
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
