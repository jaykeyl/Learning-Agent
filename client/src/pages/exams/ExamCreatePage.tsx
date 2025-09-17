import { useEffect, useRef, useState, type CSSProperties } from 'react';
import '../../components/exams/ExamForm.css';
import '../../components/shared/Toast.css';
import { ExamForm } from '../../components/exams/ExamForm';
import type { ExamFormHandle } from '../../components/exams/ExamForm';
import { Toast, useToast } from '../../components/shared/Toast';
import { readJSON, saveJSON } from '../../services/storage/localStorage';
import PageTemplate from '../../components/PageTemplate';
import GlobalScrollbar from '../../components/GlobalScrollbar';
import './ExamCreatePage.css';
import {
  generateQuestions,
  createExamApproved,
  updateExamApprovedFull,
  type GeneratedQuestion,
} from '../../services/exams.service';
import AiResults from './AiResults';
import {
  normalizeToQuestions,
  cloneQuestion,
  reorderQuestions,
} from './ai-utils';
import { isValidGeneratedQuestion } from '../../utils/aiValidation';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useExamsStore } from '../../store/examsStore';
import { Alert, Badge, Button, Space, Typography, theme } from 'antd';

const { Text } = Typography;

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
    if (replacement) fixed[i] = { ...replacement, id: q.id, include: q.include };
  }
  return fixed;
}

// Banner aislado que usa colores del tema (sin contenedor extra)
function ContextBanner({ ok }: { ok: boolean }) {
  const { token } = theme.useToken();
  return (
    <div
      className="p-[16px] mt-4 mb-0 rounded-[12px] border"
      style={{
        background: token.colorFillSecondary,
        borderColor: token.colorBorderSecondary,
      }}
      aria-live="polite"
    >
      {!ok ? (
        <Alert
          type="warning"
          message="Esta página necesita un curso."
          description="Vuelve a Gestión de exámenes desde el menú para seleccionar el curso y período correctos."
          showIcon
        />
      ) : (
        <Space>
          <Badge status="success" />
          <Text>Listo para guardar en el curso seleccionado.</Text>
        </Space>
      )}
    </div>
  );
}

export default function ExamsCreatePage() {
  const { toasts, pushToast, removeToast } = useToast();
  const formRef = useRef<ExamFormHandle>(null!);

  const [params] = useSearchParams();
  const classId = params.get('classId') || '';
  const courseId = params.get('courseId') || '';

  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.examData;

  const updateExam = useExamsStore((state) => state.updateExam);
  const addFromQuestions = useExamsStore((state) => state.addFromQuestions);

  const [aiOpen, setAiOpen] = useState(!!editData);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = useState<GeneratedQuestion[]>(
    (editData?.questions || []).map((q: GeneratedQuestion) => ({ ...q, include: true })),
  );
  const [aiMeta, setAiMeta] = useState<{
    subject: string;
    difficulty: string;
    reference?: string;
  }>({
    subject: editData?.subject || 'Tema general',
    difficulty: editData?.difficulty || 'medio',
    reference: editData?.reference || '',
  });

  const { token } = theme.useToken();

  // Variables CSS (compatibilidad para estilos globales que usan var(--app-…))
  const cssVars: CSSProperties = {
    ['--app-colorBgContainer' as any]: token.colorBgContainer,
    ['--app-colorBgElevated' as any]: token.colorBgElevated,
    ['--app-colorBorder' as any]: token.colorBorder,
    ['--app-colorBorderSecondary' as any]: token.colorBorderSecondary,
    ['--app-colorText' as any]: token.colorText,
    ['--app-colorTextSecondary' as any]: token.colorTextSecondary,
    ['--app-colorPrimary' as any]: token.colorPrimary,
    ['--app-color-bg-container' as any]: token.colorBgContainer,
    ['--app-color-bg-elevated' as any]: token.colorBgElevated,
    ['--app-color-border' as any]: token.colorBorder,
    ['--app-color-border-secondary' as any]: token.colorBorderSecondary,
    ['--app-color-text' as any]: token.colorText,
    ['--app-color-text-secondary' as any]: token.colorTextSecondary,
    ['--app-color-primary' as any]: token.colorPrimary,
  };

  useEffect(() => {
    const draft = readJSON('exam:draft') as any;
    if (!editData && draft) {
      setAiMeta({
        subject: draft.subject ?? 'Tema general',
        difficulty: draft.difficulty ?? 'medio',
        reference: draft.reference ?? '',
      });
    }
  }, [editData]);

  const ensureUniqueIds = (list: GeneratedQuestion[]) => {
    const seen = new Set<string>();
    return list.map((q, i) => {
      let id = q.id || `g_${i}_${Date.now()}`;
      while (seen.has(id)) id = `${id}_x`;
      seen.add(id);
      return { ...q, id, include: q.include ?? true };
    });
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

  // Acciones IA
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
    setAiOpen(true); // oculta el form-card y deja en primer plano el examen generado
    setAiLoading(true);
    setAiError(null);

    try {
      const dto = buildAiInputFromForm(data);
      const res = await generateQuestions(dto as any);
      const list = ensureUniqueIds(normalizeToQuestions(res));
      const fixed = await repairInvalidQuestions(list, dto, (p) => generateQuestions(p as any));
      setAiQuestions(fixed);
      if (!fixed.length) setAiError('No se pudieron regenerar preguntas.');
    } catch {
      setAiError('No se pudo generar el set.');
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
      const list = ensureUniqueIds(normalizeToQuestions(res));
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

  const onReorderQuestion = (from: number, to: number) =>
    setAiQuestions((prev) => reorderQuestions(prev, from, to));

  const onChangeQuestion = (q: GeneratedQuestion) =>
    setAiQuestions((prev) => prev.map((x) => (x.id === q.id ? q : x)));

  const onSave = async () => {
    const snap = formRef.current?.getSnapshot?.();
    const data = snap?.values ?? {};
    const questions = aiQuestions.filter((q) => q.include);

    const saveLocally = () => {
      const draft = {
        title: data.title,
        subject: aiMeta.subject,
        difficulty: aiMeta.difficulty,
        reference: aiMeta.reference,
        questions,
      };
      saveJSON('exam:draft', draft);
    };

    try {
      if (editData?.id) {
        await updateExamApprovedFull({
          examId: editData.id,
          title: aiMeta.subject || 'Examen',
          questions,
        });
        updateExam(editData.id, { ...data, id: editData.id });
      } else {
        await createExamApproved({
          classId,
          title: data.title,
          questions,
        });
        addFromQuestions(data);
      }

      saveLocally();
      pushToast('Examen guardado exitosamente.', 'success');

      navigate(courseId ? `/courses/${courseId}/periods/${classId}` : `/courses/${classId}`);
    } catch (error) {
      console.error('Error al guardar:', error);
      saveLocally();
      pushToast('Error al guardar el examen', 'error');
    }
  };

  const contextOk = Boolean(classId);

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
      <GlobalScrollbar />
      <div
        className="pantalla-scroll readable-card max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8"
        style={{ background: token.colorBgLayout, color: token.colorText }}
      >
        {/* FORM: se oculta cuando aiOpen = true */}
        {!aiOpen && (
          <section
            className="card"
            aria-label="Configuración del examen (formulario)"
            style={{
              // dejamos el form con los tokens y variables globales, sin afectar el banner
              ...cssVars,
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <ExamForm
              ref={formRef}
              onToast={pushToast}
              onGenerateAI={handleAIPropose}
              initialData={editData}
            />
          </section>
        )}

        {/* ✅ SOLO el div del banner (sin contenedor alrededor) */}
        {!aiOpen && <ContextBanner ok={contextOk} />}

        {/* Control para volver a editar la configuración cuando ya está el examen generado */}
        {aiOpen && (
          <div className="flex justify-end mb-2">
            <Button type="link" onClick={() => setAiOpen(false)}>
              Editar configuración
            </Button>
          </div>
        )}

        {aiOpen && (
          <section className="card subtle readable-card" aria-label="Examen generado">
            <AiResults
              subject={aiMeta.subject}
              difficulty={aiMeta.difficulty}
              createdAt={new Date().toLocaleDateString('es-ES')}
              reference={aiMeta.reference}
              questions={aiQuestions}
              loading={aiLoading}
              error={aiError}
              onChange={onChangeQuestion}
              onRegenerateAll={onRegenerateAll}
              onRegenerateOne={onRegenerateOne}
              onAddManual={(type) => {
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
                      text: 'Enuncia aquí la afirmación para Verdadero/Falso…',
                      include: true,
                    } as GeneratedQuestion),
                  ]);
                } else if (type === 'open_exercise') {
                  setAiQuestions((prev) => [
                    ...prev,
                    cloneQuestion({
                      id,
                      type,
                      text: 'Describe aquí el ejercicio práctico…',
                      include: true,
                    } as GeneratedQuestion),
                  ]);
                } else {
                  setAiQuestions((prev) => [
                    ...prev,
                    cloneQuestion({
                      id,
                      type,
                      text: 'Escribe aquí el problema de análisis…',
                      include: true,
                    } as GeneratedQuestion),
                  ]);
                }
              }}
              onSave={onSave}
              onReorder={onReorderQuestion}
              canSave={Boolean(classId)}
              saveDisabledReason="Esta página necesita un curso. Vuelve a Gestión de Exámenes desde el menú."
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
