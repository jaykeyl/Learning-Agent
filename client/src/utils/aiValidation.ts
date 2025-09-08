import type { GeneratedQuestion } from '../services/exams.service';

export const PLACEHOLDER_SIGNATURES = [
  'indica si la siguiente afirmación es verdadera o falsa',
  'true or false',
  'verdadera o falsa',
];

export function isPlaceholderText(text?: string): boolean {
  const t = (text || '').toLowerCase().trim();
  if (t.length < 15) return true;
  return PLACEHOLDER_SIGNATURES.some((p) => t.includes(p));
}

export function isValidGeneratedQuestion(q: GeneratedQuestion): boolean {
  if (!q) return false;
  if (isPlaceholderText(q.text)) return false;

  if (q.type === 'multiple_choice') {
    const options = (q as any).options as string[] | undefined;
    if (!options || options.length < 3) return false;
  }
  return true;
}
