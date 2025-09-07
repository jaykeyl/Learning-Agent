import api from './api/instance';

const USE_MOCK = String(import.meta.env.VITE_API_MOCK || 'false') === 'true';

export type GeneratedQuestion =
  | { id: string; type: 'multiple_choice'; text: string; options: string[]; include: boolean }
  | { id: string; type: 'true_false'; text: string; include: boolean }
  | { id: string; type: 'open_analysis'; text: string; imageUrl?: string; options?: string[]; include: boolean }
  | { id: string; type: 'open_exercise'; text: string; include: boolean };

const TEXT_KEYS = ['text', 'statement', 'question', 'prompt', 'enunciado', 'descripcion', 'description', 'body', 'content'];
const OPT_KEYS = ['options', 'choices', 'alternativas', 'opciones', 'answers'];

function pickTextLike(q: any): string {
  for (const k of TEXT_KEYS) {
    const v = q?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}
function pickOptionsLike(q: any): string[] | undefined {
  for (const k of OPT_KEYS) {
    const v = q?.[k];
    if (Array.isArray(v) && v.length) return v.map(String);
  }
  return undefined;
}

function mockQuestions(): GeneratedQuestion[] {
  return [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: '¿Cuál es la derivada de f(x) = 3x² + 2x - 5?',
      options: ['6x + 2', '3x + 2', '6x² + 2', '3x² + 2x'],
      include: true,
    },
    {
      id: 'q2',
      type: 'true_false',
      text: 'El Teorema Fundamental del Cálculo conecta derivación e integración.',
      include: true,
    },
    {
      id: 'q3',
      type: 'open_exercise',
      text: 'Resuelve la integral indefinida: ∫(4x³ - 3x² + 6x - 2) dx',
      include: true,
    },
    {
      id: 'q4',
      type: 'open_analysis',
      text: 'Analiza la siguiente gráfica y elige la interpretación correcta.',
      options: ['La velocidad aumenta', 'El movimiento es uniforme', 'La aceleración es negativa'],
      include: true,
    },
  ];
}
function toSpanishDifficulty(input?: unknown): 'fácil' | 'medio' | 'difícil' {
  const s = String(input ?? 'medio').toLowerCase();
  if (['easy', 'facil', 'fácil'].includes(s)) return 'fácil';
  if (['hard', 'dificil', 'difícil'].includes(s)) return 'difícil';
  return 'medio';
}

function buildQuestionsDto(input: Record<string, unknown> = {}) {
  const subject = String(input.subject ?? input.topic ?? 'Tema general');
  const difficulty = toSpanishDifficulty(input.difficulty);

  const distribution = {
    multiple_choice: Math.max(0, Number((input as any).distribution?.multiple_choice ?? 0) || 0),
    true_false: Math.max(0, Number((input as any).distribution?.true_false ?? 0) || 0),
    open_analysis: Math.max(0, Number((input as any).distribution?.open_analysis ?? 0) || 0),
    open_exercise: Math.max(0, Number((input as any).distribution?.open_exercise ?? 0) || 0),
  };

  const totalQuestions =
    distribution.multiple_choice +
    distribution.true_false +
    distribution.open_analysis +
    distribution.open_exercise;

  if (totalQuestions < 1) {
    throw new Error('La distribución debe contener al menos 1 pregunta en total.');
  }

  const reference =
    input.reference != null ? String(input.reference) : undefined;

  const instruction = [
    'RESPONDE EXCLUSIVAMENTE EN ESPAÑOL NEUTRO (es).',
    'Genera preguntas claras, concisas y SIN texto en inglés.',
    'Respeta EXACTAMENTE la distribución por tipo indicada.',
    `Tema/Materia: ${subject}`,
    reference ? `Contexto: ${reference}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    difficulty,      
    totalQuestions,  
    reference,
    distribution,    
    language: 'es',  
    strict: true,    
    instruction,     
  };
}

function looksSpanish(text: string): boolean {
  const t = (text || '').toLowerCase();
  const cues = [' el ', ' la ', ' los ', ' las ', ' de ', ' y ', ' que ', '¿', '¡', 'ción', 'á', 'é', 'í', 'ó', 'ú'];
  return cues.some((c) => t.includes(c));
}
function looksEnglish(text: string): boolean {
  const t = (text || '').toLowerCase();
  const hints = [
    'which of the following', 'true or false', 'explain the', 'following', 'which',
    'statement', 'algorithm', 'always', 'finite', 'time', 'hardware', 'unique solution',
    'dot product', 'determinant', 'matrix', 'gauss', 'explain how',
  ];
  return hints.some((w) => t.includes(w));
}
function forceSpanish<T extends GeneratedQuestion>(q: T, subject: string): T {
  const textIsEs = looksSpanish(q.text) && !looksEnglish(q.text);
  const id = `${q.id}`;
  if (textIsEs) {
    if (q.type === 'multiple_choice') {
      const opts = (q as any).options as string[] | undefined;
      if (opts && opts.some((o) => looksEnglish(o) && !looksSpanish(o))) {
        (q as any).options = ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
      }
    }
    return q;
  }

  if (q.type === 'multiple_choice') {
    return {
      id,
      type: 'multiple_choice',
      text: `¿Cuál de las siguientes afirmaciones es correcta sobre ${subject}?`,
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      include: true,
    } as T;
  }
  if (q.type === 'true_false') {
    return {
      id,
      type: 'true_false',
      text: `Indica si la siguiente afirmación es verdadera o falsa sobre ${subject}.`,
      include: true,
    } as T;
  }
  if (q.type === 'open_analysis') {
    const opts = (q as any).options as string[] | undefined;
    const optionsEs = Array.isArray(opts) ? opts.filter((o) => looksSpanish(o) && !looksEnglish(o)) : undefined;
    return {
      id,
      type: 'open_analysis',
      text: `Analiza el siguiente aspecto de ${subject} y justifica tu razonamiento en español.`,
      options: optionsEs && optionsEs.length ? optionsEs : undefined,
      include: true,
    } as T;
  }

  return {
    id,
    type: 'open_exercise',
    text: `Resuelve un ejercicio relacionado con ${subject} y explica cada paso en español.`,
    include: true,
  } as T;
}

function makePlaceholders(opts: {
  type: GeneratedQuestion['type'];
  count: number;
  subject: string;
  startIndex: number;
}): GeneratedQuestion[] {
  const { type, count, subject, startIndex } = opts;
  const out: GeneratedQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const id = `ph_${type}_${startIndex + i}_${Date.now()}`;
    if (type === 'multiple_choice') {
      out.push({
        id,
        type: 'multiple_choice',
        text: `Pregunta de opción múltiple sobre ${subject}.`,
        options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        include: true,
      });
    } else if (type === 'true_false') {
      out.push({
        id,
        type: 'true_false',
        text: `Afirmación de verdadero/falso sobre ${subject}.`,
        include: true,
      });
    } else if (type === 'open_analysis') {
      out.push({
        id,
        type: 'open_analysis',
        text: `Pregunta de análisis abierto acerca de ${subject}.`,
        include: true,
      });
    } else {
      out.push({
        id,
        type: 'open_exercise',
        text: `Ejercicio abierto relacionado con ${subject}.`,
        include: true,
      });
    }
  }
  return out;
}

function orderByType(items: GeneratedQuestion[]) {
  const order = ['multiple_choice', 'true_false', 'open_analysis', 'open_exercise'] as const;
  const idx = (t: GeneratedQuestion['type']) => order.indexOf(t as any);
  return [...items].sort((a, b) => idx(a.type) - idx(b.type));
}

function normalizeItem(q: any, ts: number, i: number, fallbackType?: GeneratedQuestion['type']): GeneratedQuestion {
  const rawType = String(q?.type ?? fallbackType ?? 'open_analysis').trim();
  const type = (rawType === 'boolean' ? 'true_false' : rawType) as GeneratedQuestion['type'];
  const text = pickTextLike(q);
  const imageUrl = q?.imageUrl ?? q?.image_url ?? undefined;
  const options = pickOptionsLike(q);

  const makeId = (idx: number) => `q_${ts}_${type}_${idx}`; 

  if (type === 'multiple_choice') {
    return { id: makeId(i), type: 'multiple_choice', text, options: options ?? [], include: true };
  }
  if (type === 'true_false') {
    return { id: makeId(i), type: 'true_false', text, include: true };
  }
  if (type === 'open_exercise') {
    return { id: makeId(i), type: 'open_exercise', text, include: true };
  }
  return { id: makeId(i), type: 'open_analysis', text, imageUrl, options: options ?? undefined, include: true };
}

export async function generateQuestions(input: Record<string, unknown>): Promise<GeneratedQuestion[]> {
  if (USE_MOCK) return mockQuestions();

  const dto = buildQuestionsDto(input ?? {});
  const wanted = dto.distribution;
  const subject = dto.subject;

  const res = await api.post('/exams/questions', dto);
  const payload = (res as any)?.data;

  const grouped =
    payload?.questions ??
    payload?.data?.questions ??
    (Array.isArray(payload) ? payload : null);

  if (!grouped) {
    throw new Error(payload?.message ?? 'Respuesta del servidor no válida.');
  }

  const ts = Date.now();
  let normalized: GeneratedQuestion[] = [];

  if (Array.isArray(grouped)) {
    normalized = grouped.map((q: any, i: number) => normalizeItem(q, ts, i));
  } else {
    const mcq = Array.isArray(grouped.multiple_choice) ? grouped.multiple_choice : [];
    const tf = Array.isArray(grouped.true_false) ? grouped.true_false : [];
    const oa = Array.isArray(grouped.open_analysis) ? grouped.open_analysis : [];
    const oe = Array.isArray(grouped.open_exercise) ? grouped.open_exercise : [];

    normalized = [
      ...mcq.map((q: any, i: number) => normalizeItem(q, ts, i, 'multiple_choice')),
      ...tf.map((q: any, i: number) => normalizeItem(q, ts, i, 'true_false')),
      ...oa.map((q: any, i: number) => normalizeItem(q, ts, i, 'open_analysis')),
      ...oe.map((q: any, i: number) => normalizeItem(q, ts, i, 'open_exercise')),
    ];
  }
  const spanish = normalized.map((q) => forceSpanish(q, subject));

  const byType = {
    multiple_choice: spanish.filter((q) => q.type === 'multiple_choice'),
    true_false: spanish.filter((q) => q.type === 'true_false'),
    open_analysis: spanish.filter((q) => q.type === 'open_analysis'),
    open_exercise: spanish.filter((q) => q.type === 'open_exercise'),
  };

  const out: GeneratedQuestion[] = [];

  (['multiple_choice', 'true_false', 'open_analysis', 'open_exercise'] as const).forEach((t) => {
    const want = wanted[t];
    const have = byType[t];

    if (want <= 0) return;

    if (have.length >= want) {
      out.push(...have.slice(0, want));
    } else {
      out.push(...have);
      const missing = want - have.length;
      out.push(...makePlaceholders({ type: t, count: missing, subject, startIndex: have.length }));
    }
  });

  const final = orderByType(out).slice(0, dto.totalQuestions);
  return final;
}

export async function createExam(payload: any): Promise<any> {
  if (USE_MOCK) {
    return { ok: true, data: { id: `exam_${Date.now()}`, ...payload } };
  }
  const res = await api.post('/exams', payload);
  return (res as any)?.data ?? res;
}

export type CreateExamApprovedInput = {
  courseId?: string;                
  title: string;
  status?: 'Guardado' | 'Publicado';
  content?: {
    subject?: string;
    difficulty?: string;
    createdAt?: string;
    questions: Array<{
      id: string;
      type: 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';
      text: string;
      options?: string[];
    }>;
  };
  questions?: Array<{
    id: string;
    type: 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';
    text: string;
    options?: string[];
  }>;
};

export async function createExamApproved(input: CreateExamApprovedInput) {
  const body = input.content
    ? {
        title: input.title,
        courseId: input.courseId,            
        status: input.status ?? 'Guardado',
        content: input.content,
      }
    : {
        title: input.title,
        courseId: input.courseId,            
        status: input.status ?? 'Guardado',
        content: {
          subject: 'Tema general',
          difficulty: 'medio',
          createdAt: new Date().toISOString(),
          questions: (input.questions ?? []).map((q) => ({
            id: String(q.id),
            type: q.type,
            text: String(q.text ?? ''),
            options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          })),
        },
      };

  const { data } = await api.post('/exams/approved', body);
  return data?.data ?? data;
}

export async function quickSaveExam(p: { title: string; questions: any[]; content?: any; courseId?: string; teacherId?: string }) {
  const body = p.content
    ? p
    : {
        title: p.title,
        content: {
          subject: 'Tema general',
          difficulty: 'medio',
          createdAt: new Date().toISOString(),
          questions: (p.questions ?? []).map((q: any, i: number) => ({
            id: String(q?.id ?? `q_${Date.now()}_${i}`),
            type: String(q?.type),
            text: String(q?.text ?? ''),
            options: Array.isArray(q?.options) ? q.options.map(String) : undefined,
          })),
        },
        ...(p.courseId ? { courseId: p.courseId } : {}),
        ...(p.teacherId ? { teacherId: p.teacherId } : {}),
      };

  const { data } = await api.post('/exams/quick-save', body);
  return data?.data ?? data;
}

export type CourseExamRow = {
  id: number | string;
  title: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listCourseExams(courseId: string): Promise<CourseExamRow[]> {
  const { data } = await api.get(`/courses/${courseId}/exams`);
  const rows = data?.data ?? data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export default { generateQuestions, createExam, createExamApproved };
