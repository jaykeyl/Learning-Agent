import { useRef, useState } from 'react';
import { Card, Divider, message } from 'antd';
import { generateQuestions, createExamApproved, type GeneratedQuestion } from '../../services/exams.service';
import AiResults from './AiResults';

import { normalizeToQuestions, cloneQuestion, reorderQuestions } from './ai-utils';
import { isValidGeneratedQuestion } from '../../utils/aiValidation';

import { ExamForm } from '../../components/exams/ExamForm';

type ExamFormHandle = any;

type Props = {
  classId: string;
  courseId?: string;
  onClose?: () => void;
  onCreated?: (examId: string) => void;
};

export default function InlineExamCreator({ classId, courseId, onClose, onCreated }: Props) {
  const formRef = useRef<ExamFormHandle>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<{ subject: string; difficulty: string; reference?: string }>({
    subject: '',
    difficulty: 'medio',
    reference: '',
  });
  const [aiQuestions, setAiQuestions] = useState<GeneratedQuestion[]>([]);

  const toast: (msg: string, type?: any) => void = (msg, type) => {
    const t = type === 'warn' ? 'warning' : type;
    if (t === 'success') message.success(msg);
    else if (t === 'warning') message.warning(msg);
    else if (t === 'error') message.error(msg);
    else message.info(msg);
  };

  const firstNonEmpty = (...vals: Array<unknown>): string | undefined => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return undefined;
  };

  const buildAiInput = (raw: Record<string, any>) => {
    const difficultyMap: Record<string, 'fácil' | 'medio' | 'difícil'> = {
      facil: 'fácil', 'fácil': 'fácil', easy: 'fácil',
      medio: 'medio', media: 'medio', medium: 'medio',
      dificil: 'difícil', 'difícil': 'difícil', hard: 'difícil',
    };
    const difficulty = difficultyMap[String(raw.difficulty ?? 'medio').toLowerCase()] ?? 'medio';

    const subjectCandidate = firstNonEmpty(
      raw.subject, raw.topic, raw.titulo, raw.title, raw.materia, raw.asignatura
    );
    const subject = subjectCandidate ?? `Examen - ${((courseId && String(courseId).trim()) || 'Materia')}`;

    const distribution = {
      multiple_choice: Number(raw.multipleChoice ?? raw.mc ?? 0) || 0,
      true_false: Number(raw.trueFalse ?? raw.tf ?? 0) || 0,
      open_analysis: Number(raw.analysis ?? raw.an ?? 0) || 0,
      open_exercise: Number(raw.openEnded ?? raw.ej ?? 0) || 0,
    };

    const totalQuestions =
      distribution.multiple_choice +
      distribution.true_false +
      distribution.open_analysis +
      distribution.open_exercise;

    return {
      subject,
      difficulty,
      totalQuestions,
      reference: raw.reference ?? '',
      distribution,
      classId,
      courseId,
      language: 'es',
    };
  };

  const onGenerateAI = async (maybeValues?: any) => {
    try {
      setAiError(null);
      const values = maybeValues ?? formRef.current?.getSnapshot?.()?.values ?? {};
      const aiInput = buildAiInput(values);
      setAiMeta({ subject: aiInput.subject, difficulty: aiInput.difficulty, reference: aiInput.reference });

      setAiLoading(true);
      const resp = await generateQuestions(aiInput as any);
      const normalized = normalizeToQuestions((((resp as any)?.questions) ?? resp) || []);
      if (!normalized.length) {
        setAiError('La IA no devolvió preguntas. Intenta nuevamente.');
        setAiOpen(false);
        return;
      }
      setAiQuestions(normalized);
      setAiOpen(true);
      message.success('Preguntas generadas. Revísalas antes de guardar.');
    } catch {
      setAiError('Error generando preguntas con IA.');
      setAiOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const onChangeQuestion = (q: GeneratedQuestion) => {
    if (!isValidGeneratedQuestion(q)) {
      message.error('La pregunta no es válida.');
      return;
    }
    setAiQuestions(prev => prev.map(x => (x.id === q.id ? q : x)));
  };

  const onRegenerateAll = async () => {
    const values = formRef.current?.getSnapshot?.()?.values ?? {};
    const input = buildAiInput(values);
    const dist = {
      multiple_choice: aiQuestions.filter(q => q.type === 'multiple_choice').length,
      true_false: aiQuestions.filter(q => q.type === 'true_false').length,
      open_analysis: aiQuestions.filter(q => q.type === 'open_analysis').length,
      open_exercise: aiQuestions.filter(q => q.type === 'open_exercise').length,
    };
    setAiLoading(true);
    try {
      const resp = await generateQuestions({ ...input, distribution: dist } as any);
      const normalized = normalizeToQuestions((((resp as any)?.questions) ?? resp) || []);
      setAiQuestions(normalized);
    } catch {
      setAiError('No se pudo regenerar todas las preguntas.');
    } finally {
      setAiLoading(false);
    }
  };

  const onRegenerateOne = async (q: GeneratedQuestion) => {
    setAiLoading(true);
    try {
      const resp = await generateQuestions({
        subject: aiMeta.subject || `Examen - ${((courseId && String(courseId).trim()) || 'Materia')}`,
        difficulty: aiMeta.difficulty || 'medio',
        totalQuestions: 1,
        reference: aiMeta.reference || '',
        classId,
        courseId,
        language: 'es',
      } as any);
      const normalized = normalizeToQuestions((((resp as any)?.questions) ?? resp) || []);
      const only = normalized?.[0];
      if (only) {
        setAiQuestions(prev => prev.map(x => (x.id === q.id ? { ...only, id: q.id, include: q.include } : x)));
      } else {
        setAiError('No se pudo regenerar esa pregunta.');
      }
    } catch {
      setAiError('No se pudo regenerar esa pregunta.');
    } finally {
      setAiLoading(false);
    }
  };

  const onReorder = (from: number, to: number) => {
    setAiQuestions(prev => reorderQuestions(prev, from, to));
  };

  const onSave = async () => {
    const selected = aiQuestions.filter(q => q.include);
    if (!selected.length) {
      message.warning('Selecciona al menos una pregunta antes de guardar.');
      return;
    }

    const values = formRef.current?.getSnapshot?.()?.values ?? {};
    const subjectCandidate = firstNonEmpty(
      values.subject, values.topic, values.titulo, values.title, values.materia, values.asignatura, aiMeta.subject
    );
    const subjectForSave = subjectCandidate ?? `Examen - ${((courseId && String(courseId).trim()) || 'Materia')}`;

    const payload = {
      classId,
      title: String(subjectForSave || 'Examen'),
      status: 'Guardado' as const,
      content: {
        subject: String(subjectForSave || 'Tema general'),
        difficulty: String(values.difficulty || aiMeta.difficulty || 'medio'),
        reference: String(values.reference || aiMeta.reference || ''),
        questions: selected,
      },
      questions: selected,
    };

    await createExamApproved(payload as any);
    message.success('Examen guardado correctamente.');
    onCreated?.(payload.title);
    onClose?.();
  };

  return (
    <Card className="inline-exam-creator" bordered size="small" style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
      <ExamForm
        ref={formRef}
        onGenerateAI={onGenerateAI}
        onToast={toast}
        initialData={{}}
      />

      {aiOpen && (
        <>
          <Divider />
          <AiResults
            subject={aiMeta.subject}
            difficulty={aiMeta.difficulty}
            createdAt={new Date().toLocaleDateString('es-BO')}
            questions={aiQuestions}
            loading={aiLoading}
            error={aiError}
            onChange={onChangeQuestion}
            onRegenerateAll={onRegenerateAll}
            onRegenerateOne={onRegenerateOne}
            onAddManual={(type) => {
              const id = `manual_${Date.now()}`;
              if (type === 'multiple_choice') {
                setAiQuestions(prev => ([...prev, cloneQuestion({ id, type, text: 'Escribe aquí el enunciado…', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], include: true } as any)]));
              } else if (type === 'true_false') {
                setAiQuestions(prev => ([...prev, cloneQuestion({ id, type, text: 'Enuncia una proposición para Verdadero/Falso…', include: true } as any)]));
              } else if (type === 'open_exercise') {
                setAiQuestions(prev => ([...prev, cloneQuestion({ id, type, text: 'Plantea aquí el ejercicio…', include: true } as any)]));
              } else {
                setAiQuestions(prev => ([...prev, cloneQuestion({ id, type, text: 'Escribe aquí la consigna de análisis…', include: true } as any)]));
              }
            }}
            onSave={onSave}
            onReorder={onReorder}
          />
        </>
      )}
    </Card>
  );
}
