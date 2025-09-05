import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useExamForm } from '../../hooks/useExamForm.ts';
import { createExam } from '../../services/exams.service';
import { Button, theme } from 'antd';

import type { ToastKind } from '../shared/Toast';

type Props = {
  onToast: (msg: string, type?: ToastKind) => void;
  onGenerateAI?: () => void | Promise<void>;
};

export type ExamFormHandle = { getSnapshot: () => any };

export const ExamForm = forwardRef<ExamFormHandle, Props>(function ExamForm(
  { onToast, onGenerateAI },
  ref
) {
  const { setValue, validate, getSnapshot, values: hookValues, getTotalQuestions } = useExamForm();
  const { token } = theme.useToken();

  const [values, setValues] = useState({
    ...hookValues,
    multipleChoice: '',
    trueFalse: '',
    analysis: '',
    openEnded: '',
  });
  

  const totalQuestions = getTotalQuestions();

  const [step, setStep] = useState(0);
  const steps = ['Datos generales', 'Cantidad de preguntas', 'Tiempo y referencia'];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  useImperativeHandle(ref, () => ({ getSnapshot }), [getSnapshot]);

  useEffect(() => {
    return () => {
      setValues({
        subject: '',
        difficulty: '',
        attempts: '',
        multipleChoice: '',
        trueFalse: '',
        analysis: '',
        openEnded: '',
        timeMinutes: '',
        reference: '',
      });
      setValue('subject', '');
      setValue('difficulty', '');
      setValue('attempts', '');
      setValue('multipleChoice', '');
      setValue('trueFalse', '');
      setValue('analysis', '');
      setValue('openEnded', '');
      setValue('timeMinutes', '');
      setValue('reference', '');
    };
  }, []);

  const onChange = (name: string, value: string) => {
    const v = name === 'subject' ? value.replace(/\s+/g, ' ').trimStart() : value;
    setValues((prev) => ({ ...prev, [name]: v }));
    setValue(name as any, v);
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (name === 'attempts') {
      const errorMsg = validateAttempts(value);
      setErrors((prev) => ({ ...prev, attempts: errorMsg }));
    } else {
      touchAndValidate();
    }
  };

  const touchAndValidate = () => {
    const { valid, errors } = validate();
    setErrors(errors);
    return valid;
  };

  const validStep = () => {
    if (step === 0) {
      const attemptsError = validateAttempts(String(values.attempts));
      return !!(values.subject && values.difficulty && values.attempts) && !attemptsError;
    }
    if (step === 1) return totalQuestions > 0;
    if (step === 2) {
      return !!values.timeMinutes && !errors.timeMinutes;
    }
    return Boolean(values.timeMinutes) && !errors.timeMinutes;
  };

  const hasQuestions = totalQuestions > 0;

  const onResetStep = () => {
    if (step === 0) {
      setValues((prev) => ({
        ...prev,
        subject: '',
        difficulty: '',
        attempts: '',
      }));
      setValue('subject', '');
      setValue('difficulty', '');
      setValue('attempts', '');
      onToast('Datos generales limpiados.', 'info');
    } else if (step === 1) {
      setValues((prev) => ({
        ...prev,
        multipleChoice: '',
        trueFalse: '',
        analysis: '',
        openEnded: '',
      }));
      setValue('multipleChoice', '');
      setValue('trueFalse', '');
      setValue('analysis', '');
      setValue('openEnded', '');
      onToast('Cantidad de preguntas limpiada.', 'info');
    } else if (step === 2) {
      setValues((prev) => ({
        ...prev,
        timeMinutes: '',
        reference: '',
      }));
      setValue('timeMinutes', '');
      setValue('reference', '');
      onToast('Tiempo y referencia limpiados.', 'info');
    }
    touchAndValidate();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!touchAndValidate()) return;
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    if (!hasQuestions) {
      onToast('Debes escoger al menos una pregunta de algún tipo.', 'warn');
      return;
    }
    setSending(true);
    try {
      const snap = getSnapshot();
      const res = await createExam(snap.values);
      if (res?.ok) onToast('Examen creado correctamente.', 'info');
      else onToast(res?.error || 'Error desconocido.', 'error');
    } catch {
      onToast('No fue posible conectar con el servidor.', 'error');
    } finally {
      setSending(false);
    }
  };

  const validateAttempts = (value: string) => {
    const num = Number(value);
    if (value === '' || isNaN(num)) {
      return 'Debes ingresar un número de intentos.';
    }
    if (num < 1) {
      return 'El número de intentos debe ser al menos 1.';
    }
    if (num > 3) {
      return 'El número de intentos no puede ser mayor a 3.';
    }
    return '';
  };

  return (
    <form
      id="exam-form"
      onSubmit={onSubmit}
      noValidate
      className="card max-w-3xl w-full mx-auto rounded-xl shadow-sm"
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorder,
        borderWidth: 2,
        borderStyle: 'solid',
        color: token.colorText,
      }}
    >
      <div className="card-content">
        <div className="p-4 sm:p-5 md:p-6" >
          <div className="steps-container flex flex-wrap items-center  justify-center gap-3 sm:gap- mb-3 sm:mb-4">
            {steps.map((s, i) => (
              <div
                key={i}
                className="step-item-center px-3 sm:px-4 py-2 transition-all rounded-md text-center"
                style={{
                  fontWeight: step === i ? 700 : 400,
                  color: step === i ? token.colorPrimary : token.colorTextTertiary,
                  borderBottom: `2px solid ${step === i ? token.colorPrimary : token.colorBorder}`,
                  fontSize: 'clamp(0.9rem, 1vw + 0.5rem, 1.1rem)',

                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="form-grid grid grid-cols-1 sm:grid-cols-2 sm:gap-5 lg:gap-6 px-4 sm:px-5 md:px-6 pb-4 sm:pb-0">
          {step === 0 && (
            <>
              <div className="form-group sm:col-span-2">
                <label htmlFor="subject" className="block text-sm font-medium mb-1">
                  Materia *
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  maxLength={30}
                  className="
                    w-full rounded-lg
                    border-2 px-3 py-2
                    text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                    outline-none transition
                    focus:ring-2
                  "
                  placeholder="Ej: Algorítmica 1"
                  value={values.subject || ''}
                  onChange={(e) => onChange('subject', e.target.value)}
                  autoComplete="off"
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    boxShadow: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${token.colorPrimary}`)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                />
                {touched.subject && errors.subject && (
                  <small className="error block mt-1 text-xs text-red-500">{errors.subject}</small>
                )}
                <small className="help block mt-1 text-xs opacity-70">Máx. 30 caracteres</small>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty" className="block text-sm font-medium mb-1">
                  Dificultad *
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  className="
                    w-full rounded-lg
                    border-2 px-3 py-2
                    text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                    outline-none transition
                    focus:ring-2
                  "
                  value={values.difficulty || ''}
                  onChange={(e) => onChange('difficulty', e.target.value)}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    boxShadow: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${token.colorPrimary}`)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <option value="" style={{ background: token.colorBgContainer, color: token.colorText }}>
                    Selecciona…
                  </option>
                  <option value="fácil" style={{ background: token.colorBgContainer, color: token.colorText }}>
                    Fácil
                  </option>
                  <option value="medio" style={{ background: token.colorBgContainer, color: token.colorText }}>
                    Medio
                  </option>
                  <option value="difícil" style={{ background: token.colorBgContainer, color: token.colorText }}>
                    Difícil
                  </option>
                </select>
                {touched.difficulty && errors.difficulty && (
                  <small className="error block mt-1 text-xs text-red-500">{errors.difficulty}</small>
                )}
              </div>

              <div className="form-group sm:col-span-1">
                <label htmlFor="attempts" className="block text-sm font-medium mb-1">
                  N.º de intentos *
                </label>
                <input
                  id="attempts"
                  name="attempts"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="1"
                  className="
                    w-full rounded-lg
                    border-2 px-3 py-2
                    text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                    outline-none transition
                    focus:ring-2
                  "
                  value={values.attempts || ''}
                  onChange={(e) => onChange('attempts', e.target.value)}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    boxShadow: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${token.colorPrimary}`)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                />
                {touched.attempts && errors.attempts && (
                  <small className="error block mt-1 text-xs text-red-500">{errors.attempts}</small>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <div
              className="form-group question-types-container sm:col-span-11 w-full"
              style={{
                gridColumn: '1/4',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <label className="w-full text-center font-bold text-[clamp(1rem,1.2vw+0.6rem,1.15rem)] my-0">
                Cantidad de preguntas por tipo *
              </label>

              <div
                className="
                  question-types-grid
                  grid grid-cols-1 gap-4 w-full
                  sm:grid-cols-2
                  lg:grid-cols-4
                  rounded-lg p-4
                "
                style={{
                  background: token.colorBgContainer,
                  borderRadius: 8,
                }}
              >
                <div className="question-type rounded-lg border p-3"
                  style={{ borderColor: token.colorBorder, borderWidth: 2, borderStyle: 'solid' }}
                >
                  <label htmlFor="multipleChoice" className="question-type-label block mb-2 font-medium w-full text-center">
                    Opción Múltiple
                  </label>
                  <input
                    id="multipleChoice"
                    name="multipleChoice"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="
                      input-hover w-full rounded-lg border-2 px-1 py-1
                      text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                      outline-none transition focus:ring-2 
                    "
                    value={values.multipleChoice || ''}
                    onChange={(e) => onChange('multipleChoice', e.target.value)}
                    style={{
                      background: token.colorBgContainer,
                      color: token.colorText,
                      borderColor: token.colorBorder,
                      borderWidth: 2,
                      borderStyle: 'solid',
                    }}
                  />
                </div>

                <div className="question-type rounded-lg border p-3"
                  style={{ borderColor: token.colorBorder, borderWidth: 2, borderStyle: 'solid' }}
                >
                  <label htmlFor="trueFalse" className="question-type-label block mb-2 font-medium w-full text-center">
                    Verdadero o Falso
                  </label>
                  <input
                    id="trueFalse"
                    name="trueFalse"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="
                      input-hover w-full rounded-lg border-2 px-3 py-2
                      text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                      outline-none transition focus:ring-2
                    "
                    value={values.trueFalse || ''}
                    onChange={(e) => onChange('trueFalse', e.target.value)}
                    style={{
                      background: token.colorBgContainer,
                      color: token.colorText,
                      borderColor: token.colorBorder,
                      borderWidth: 2,
                      borderStyle: 'solid',
                    }}
                  />
                </div>

                <div className="question-type rounded-lg border p-3"
                  style={{ borderColor: token.colorBorder, borderWidth: 2, borderStyle: 'solid' }}
                >
                  <label htmlFor="analysis" className="question-type-label block mb-2 font-medium w-full text-center">
                    Análisis
                  </label>
                  <input
                    id="analysis"
                    name="analysis"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="
                      input-hover w-full rounded-lg border-2 px-3 py-2
                      text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                      outline-none transition focus:ring-2
                    "
                    value={values.analysis || ''}
                    onChange={(e) => onChange('analysis', e.target.value)}
                    style={{
                      background: token.colorBgContainer,
                      color: token.colorText,
                      borderColor: token.colorBorder,
                      borderWidth: 2,
                      borderStyle: 'solid',
                    }}
                  />
                </div>

                <div className="question-type rounded-lg border p-3"
                  style={{ borderColor: token.colorBorder, borderWidth: 2, borderStyle: 'solid' }}
                >
                  <label htmlFor="openEnded" className="question-type-label block mb-2 font-medium ">
                    Ejercicio Abierto
                  </label>
                  <input
                    id="openEnded"
                    name="openEnded"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="
                      input-hover w-full rounded-lg border-2 px-3 py-2
                      text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                      outline-none transition focus:ring-2
                    "
                    value={values.openEnded || ''}
                    onChange={(e) => onChange('openEnded', e.target.value)}
                    style={{
                      background: token.colorBgContainer,
                      color: token.colorText,
                      borderColor: token.colorBorder,
                      borderWidth: 2,
                      borderStyle: 'solid',
                    }}
                  />
                </div>
              </div>

              <div
                className="w-full my-0 font-semibold text-center"
                style={{ color: token.colorText }}
              >
                Total de preguntas: <span>{totalQuestions}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label htmlFor="timeMinutes" className="block text-sm font-medium mb-1">
                  Tiempo (min) *
                </label>
                <input
                  id="timeMinutes"
                  name="timeMinutes"
                  type="number"
                  min={45}
                  max={240}
                  step={1}
                  placeholder="45"
                  className="
                    input-hover w-full rounded-lg border-2 px-3 py-2
                    text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                    outline-none transition focus:ring-2
                  "
                  value={values.timeMinutes || ''}
                  onChange={(e) => onChange('timeMinutes', e.target.value)}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                />
                {touched.timeMinutes && errors.timeMinutes && (
                  <small className="error block mt-1 text-xs text-red-500">{errors.timeMinutes}</small>
                )}
              </div>

              <div className="form-group sm:col-span-2">
                <label htmlFor="reference" className="block text-sm font-medium mb-1">
                  Material de referencia (opcional)
                </label>
                <textarea
                  id="reference"
                  name="reference"
                  rows={3}
                  placeholder="..."
                  className="
                    input-hover w-full rounded-lg border-2 px-3 py-2
                    text-[clamp(0.95rem,0.7vw+0.75rem,1.05rem)]
                    outline-none transition focus:ring-2
                  "
                  value={values.reference || ''}
                  onChange={(e) => onChange('reference', e.target.value)}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                />
                <small className="help block mt-1 text-xs opacity-70">Máx. 1000 caracteres</small>
                {touched.reference && errors.reference && (
                  <small className="error block mt-1 text-xs text-red-500">{errors.reference}</small>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="actions-row button-hover border-t flex justify-between items-center flex-wrap gap-3 px-4 " 
        style={{
          alignItems: 'center',
          marginTop: 20,
          position: 'relative',
          minHeight: 10,
          padding: 20,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-1 py-1">
          {step > 0 && (
            <Button type="default" onClick={() => setStep((s) => s - 1)}>
              Anterior
            </Button>
          )}
          <Button
            type="default"
            onClick={onResetStep}
            disabled={
              (step === 0 && !values.subject && !values.difficulty && !values.attempts) ||
              (step === 1 && !values.multipleChoice && !values.trueFalse && !values.analysis && !values.openEnded) ||
              (step === 2 && !values.timeMinutes && !values.reference)
            }
            style={{ marginLeft: 8 }}
          >
            Limpiar
          </Button>
        </div>
         <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-1 py-1">
          {step < 2 && (
            <Button
              type="primary"
              disabled={sending || !validStep()}
              onClick={(e) => {
                e.preventDefault();
                if (validStep()) setStep((s) => s + 1);
              }}
            >
              Siguiente
            </Button>
          )}
          {step === 2 && onGenerateAI && (
            <Button
            type="primary"
            disabled={sending || !validStep()}
            onClick={() => {
              if (validStep()) {
                onGenerateAI?.();
              }
             }}
             >
              Generar preguntas con IA
              </Button>
            )}
        </div>
      </div>
    </form>
  );
});
