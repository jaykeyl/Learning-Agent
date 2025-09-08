import type { GeneratedQuestion } from '../../services/exams.service';

const TEXT_KEYS = ['text','statement','question','prompt','enunciado','descripcion','description','body','content'] as const;
const OPT_KEYS  = ['options','choices','alternativas','opciones','answers'] as const;

export function pickTextLike(q: any): string {
  for (const k of TEXT_KEYS) {
    const v = q?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export function pickOptionsLike(q: any): string[] | undefined {
  for (const k of OPT_KEYS) {
    const v = q?.[k];
    if (Array.isArray(v) && v.length) return v.map(String);
  }
  return undefined;
}

export function cloneQuestion<T extends GeneratedQuestion>(q: T): T {
  if (q.type === 'multiple_choice') {
    return { ...q, options: Array.isArray(q.options) ? [...q.options] : [] } as T;
  }
  if (q.type === 'open_analysis') {
    const opts = Array.isArray(q.options) ? [...q.options] : undefined;
    return { ...q, options: opts } as T;
  }
  return { ...q } as T;
}

export function ensureUniqueIds(list: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>();
  return list.map(q => {
    let id = q.id;
    while (seen.has(id)) {
      id = `${id}_${Math.random().toString(36).slice(2,7)}`;
    }
    seen.add(id);
    return { ...q, id };
  });
}

export function replaceQuestion(list: GeneratedQuestion[], q: GeneratedQuestion): GeneratedQuestion[] {
  const safe = cloneQuestion(q);
  return list.map(x => (x.id === q.id ? safe : x));
}

export function reorderQuestions(list: GeneratedQuestion[], from: number, to: number): GeneratedQuestion[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export function normalizeToQuestions(res: any): GeneratedQuestion[] {
  if (Array.isArray(res)) return ensureUniqueIds(res.map(cloneQuestion));
  const buckets = res?.data?.questions ?? res?.questions;
  if (buckets && typeof buckets === 'object') {
    const types = ['multiple_choice','true_false','open_analysis','open_exercise'] as const;
    const out: GeneratedQuestion[] = [];
    types.forEach((t) => {
      const arr: any[] = (buckets as any)[t] || [];
      arr.forEach((raw: any, idx: number) => {
        const base = {
          id: raw?.id ?? `${t}_${idx}_${Date.now()}`,
          type: t,
          text: pickTextLike(raw),
          include: raw?.include ?? true,
        } as GeneratedQuestion;
        if (t === 'multiple_choice') {
          const opts = pickOptionsLike(raw) ?? [];
          out.push(cloneQuestion({ ...base, options: opts, type: 'multiple_choice' }));
        } else if (t === 'open_analysis') {
          const opts = pickOptionsLike(raw);
          out.push(cloneQuestion({ ...base, options: opts, type: 'open_analysis' }));
        } else if (t === 'true_false') {
          out.push(cloneQuestion({ ...base, type: 'true_false' }));
        } else {
          out.push(cloneQuestion({ ...base, type: 'open_exercise' }));
        }
      });
    });
    return ensureUniqueIds(out);
  }
  return [];
}
