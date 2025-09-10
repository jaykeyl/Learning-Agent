import { readJSON, removeItem, saveJSON } from '../services/storage/localStorage.ts';

type Values = {
  subject: string;
  difficulty: 'fácil' | 'medio' | 'difícil' | '';
  attempts: string | number;
  timeMinutes: string | number;
  reference?: string;
  multipleChoice: string | number;
  trueFalse: string | number;
  analysis: string | number;     
  openEnded: string | number;    
};

const limits = { subjectMax: 30, referenceMax: 1000, timeMin: 45, timeMax: 240 };

const toInt = (v: any) => Number.isInteger(Number(v)) ? Number(v) : NaN;
const isPosInt = (v: any) => {
  const n = toInt(v);
  return Number.isInteger(n) && n > 0;
};

export function useExamForm() {
  const draft = (readJSON('exam:draft') || {}) as Partial<Values>;

  let values: Values = {
    subject: '',
    difficulty: '',
    attempts: '',
    timeMinutes: '',
    reference: '',
    multipleChoice: '',
    trueFalse: '',
    analysis: '',
    openEnded: '',
    ...draft
  };

  let errors: Record<string, string> = {};

  const setValue = (name: keyof Values, value: any) => {
    const v = name === 'subject' ? String(value ?? '').replace(/\s+/g, ' ').trimStart() : value;
    (values as any)[name] = v;
    validateField(name, v);
    saveJSON('exam:draft', values);
  };

  const reset = () => {
    values = {
      subject: '',
      difficulty: '',
      attempts: '',
      timeMinutes: '',
      reference: '',
      multipleChoice: '',
      trueFalse: '',
      analysis: '',
      openEnded: '',
    };
    errors = {};
    removeItem('exam:draft');
  };

  const getTotalQuestions = () => {
    const parts = [
      values.multipleChoice,
      values.trueFalse,
      values.analysis,
      values.openEnded
    ].map(v => toInt(v || 0));
    if (parts.some(Number.isNaN)) return 0;
    return parts.reduce((a, b) => a + b, 0);
  };

  const validate = () => {
    errors = {};

    if (!values.subject || !values.subject.toString().trim()) {
      errors.subject = 'La materia es obligatoria.';
    } else if (values.subject.toString().trim().length > limits.subjectMax) {
      errors.subject = `Máximo ${limits.subjectMax} caracteres.`;
    }

    const allowed = ['fácil','medio','difícil'];
    if (!allowed.includes(values.difficulty || '')) {
      errors.difficulty = 'Selecciona una dificultad válida.';
    }

    if (!isPosInt(values.attempts)) errors.attempts = 'Los intentos no pueden estar vacíos ';
    if (!isPosInt(values.timeMinutes)) {
      errors.timeMinutes = 'El tiempo no puede estar vacío';
    } else {
      const t = toInt(values.timeMinutes);
      if (t < limits.timeMin) errors.timeMinutes = `Mínimo ${limits.timeMin} minutos.`;
      else if (t > limits.timeMax) errors.timeMinutes = `Máximo ${limits.timeMax} minutos (4 horas).`;
    }

    ([
      ['multipleChoice','Opción múltiple'],
      ['trueFalse','Verdadero/Falso'],
      ['analysis','Análisis'],
      ['openEnded','Ejercicio']
    ] as const).forEach(([key, label]) => {
      const raw = (values as any)[key];
      const n = toInt(raw === '' || raw === undefined ? 0 : raw);
      if (Number.isNaN(n) || n < 0) {
        errors[key] = `${label} debe ser un entero ≥ 0.`;
      }
    });

    if (values.reference && String(values.reference).length > limits.referenceMax) {
      errors.reference = `Máximo ${limits.referenceMax} caracteres.`;
    }

    if (getTotalQuestions() <= 0) {
      errors['__total'] = 'Debes definir al menos 1 pregunta en total.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateField = (name: keyof Values, value: any) => {
    if (name === 'subject') {
      if (!String(value ?? '').trim()) errors.subject = 'La materia es obligatoria.';
      else if (String(value).trim().length > limits.subjectMax) errors.subject = `Máximo ${limits.subjectMax} caracteres.`;
      else delete errors.subject;
      return;
    }
    if (name === 'difficulty') {
      const allowed = ['fácil','medio','difícil'];
      if (!allowed.includes(value || '')) errors.difficulty = 'Selecciona una dificultad válida.';
      else delete errors.difficulty;
      return;
    }
    if (name === 'attempts') {
      if (!isPosInt(value)) errors.attempts = 'Los intentos no pueden estar vacíos '; else delete errors.attempts;
      return;
    }
    if (name === 'timeMinutes') {
      const n = toInt(value);
      if (!Number.isInteger(n)) {
        errors.timeMinutes = 'El tiempo no puede estar vacío';
      } else if (n < limits.timeMin) {
        errors.timeMinutes = `Mínimo ${limits.timeMin} minutos.`;
      } else if (n > limits.timeMax) {
        errors.timeMinutes = `Máximo ${limits.timeMax} minutos (4 horas).`;
      } else {
        delete errors.timeMinutes;
      }
      return;
    }
    if (['multipleChoice','trueFalse','analysis','openEnded'].includes(name as string)) {
      const raw = value;
      const n = toInt(raw === '' || raw === undefined ? 0 : raw);
      if (Number.isNaN(n) || n < 0) {
        errors[name as string] = 'Debe ser entero ≥ 0.';
      } else {
        delete errors[name as string];
      }
      if (getTotalQuestions() <= 0) errors['__total'] = 'Debes definir al menos 1 pregunta.';
      else delete errors['__total'];
      return;
    }

    if (name === 'reference') {
      if (value && String(value).length > limits.referenceMax) errors.reference = `Máximo ${limits.referenceMax} caracteres.`;
      else delete errors.reference;
    }
  };

  return {
    setValue, reset, validate,
    getTotalQuestions,
    getSnapshot: () => ({
      values: { ...values, totalQuestions: getTotalQuestions() },
      errors: { ...errors }
    }),
    values
  };
}
