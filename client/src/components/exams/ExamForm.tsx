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
    timeMinutes: 45,
  });

  const [step, setStep] = useState(0);
  const steps = ['Datos generales', 'Cantidad de preguntas', 'Tiempo y referencia'];

  // Forzar que el slider siempre inicie en 45 min al entrar al paso 2
  useEffect(() => {
    if (step === 2) {
      setValues((prev) => ({
        ...prev,
        timeMinutes: 45,
      }));
      setValue('timeMinutes', 45);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const totalQuestions = getTotalQuestions();
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
        timeMinutes: 45,
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
    touchAndValidate();
  };

  const touchAndValidate = () => {
    const { valid, errors } = validate();
    setErrors(errors);
    return valid;
  };

  const validStep = () => {
    if (step === 0) return !!(values.subject && values.difficulty && values.attempts);
    if (step === 1) return totalQuestions > 0;
    if (step === 2) return !!values.timeMinutes;
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
        timeMinutes: 45,
        reference: '',
      }));
      setValue('timeMinutes', 45);
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

  return (
    <form id="exam-form" onSubmit={onSubmit} noValidate className="card" style={{
      background: token.colorBgContainer,
      borderColor: token.colorBorder,
      borderWidth: 2,
      borderStyle: 'solid',
      color: token.colorText,
      padding:0,
      
      
    }}>
      <div className="card-content">
        <div style={{ padding:12 }}>
          <div className="steps-container" style={{ display: 'flex', alignItems:'center', gap: 20, marginBottom: 15 }}>
            {steps.map((s, i) => (
              <div
                key={i}
                className="step-item"
                style={{
                  fontWeight: step === i ? 700 : 400,
                  color: step === i ? token.colorPrimary : token.colorTextTertiary,
                  borderBottom: `2px solid ${step === i ? token.colorPrimary : token.colorBorder}`,
                  padding: '20px 20px',
                  transition: 'all 0.2s',
                  fontSize: 17,
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="form-grid">
          {step === 0 && (
            <>
              <div className="form-group inline">
                <label htmlFor="subject">Materia *</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  maxLength={30}
                  className="input-hover subject-hover input-short"
                  placeholder="Ej: Algorítmica 1"
                  value={values.subject || ''}
                  onChange={(e) => onChange('subject', e.target.value)}
                  autoComplete="off" 
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                />
                {touched.subject && errors.subject && <small className="error">{errors.subject}</small>}
                <small className="help">Máx. 30 caracteres</small>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Dificultad *</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  className="input-hover subject-hover input-short"
                  value={values.difficulty || ''}
                  onChange={(e) => onChange('difficulty', e.target.value)}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                >
                  <option value="" style={{ background: token.colorBgContainer, color: token.colorText }}>Selecciona…</option>
                  <option value="fácil" style={{ background: token.colorBgContainer, color: token.colorText }}>Fácil</option>
                  <option value="medio" style={{ background: token.colorBgContainer, color: token.colorText }}>Medio</option>
                  <option value="difícil" style={{ background: token.colorBgContainer, color: token.colorText }}>Difícil</option>
                </select>
                {touched.difficulty && errors.difficulty && <small className="error">{errors.difficulty}</small>}
              </div>

              <div className="form-group centered span-2">
                <label htmlFor="attempts">N.º de intentos *</label>
                <input
                  id="attempts"
                  name="attempts"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="1"
                  className="input-hover subject-hover input-short"
                  value={values.attempts || ''}
                  onChange={(e) => onChange('attempts', e.target.value)}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderColor: token.colorBorder,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                />
                {touched.attempts && errors.attempts && <small className="error">{errors.attempts}</small>}
              </div>
            </>
          )}

          {step === 1 && (
            <div className="form-group question-types-container" style={{
              gridColumn: '1/3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}>
              <label style={{ fontWeight: 700, textAlign: 'center', width: '100%' }}>
                Cantidad de preguntas por tipo *
              </label>

              <div
                className="question-types-grid"
                style={{
                  background: token.colorBgContainer,
                  borderRadius: 8,
                }}
              >
                <div className="question-type">
                  <label htmlFor="multipleChoice" className="question-type-label" style={{ display: 'block', marginBottom: 10 }}>
                    Opción Múltiple
                  </label>
                  <input
                    id="multipleChoice"
                    name="multipleChoice"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="input-hover"
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

                <div className="question-type" >
                  <label htmlFor="trueFalse" className="question-type-label" style={{ display: 'block', marginBottom: 10 }}>
                    Verdadero o Falso
                  </label>
                  <input
                    id="trueFalse"
                    name="trueFalse"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="input-hover"
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

                <div className="question-type">
                  <label htmlFor="analysis" className="question-type-label" style={{ display: 'block', marginBottom: 10 }}>
                    Análisis
                  </label>
                  <input
                    id="analysis"
                    name="analysis"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="input-hover"
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

                <div className="question-type" >
                  <label htmlFor="openEnded" className="question-type-label" style={{ display: 'block', marginBottom: 10 }}>
                    Ejercicio Abierto
                  </label>
                  <input
                    id="openEnded"
                    name="openEnded"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="input-hover"
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

              <div style={{ width: '100%', marginTop: 16, fontWeight: 600, textAlign: 'center', color: token.colorText }}>
                Total de preguntas: <span>{totalQuestions}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <label htmlFor="timeMinutes" style={{ fontWeight: 500, marginBottom: 4 }}>Tiempo (min) </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                  <input
                    id="timeMinutes"
                    name="timeMinutes"
                    type="range"
                    min={45}
                    max={240}
                    step={1}
                    value={values.timeMinutes}
                    onChange={e => onChange('timeMinutes', e.target.value)}
                    style={{
                      flex: 1,
                      accentColor: token.colorPrimary,
                    }}
                  />
                  <span style={{ minWidth: 60, fontWeight: 500, fontSize: 16 }}>{values.timeMinutes} min</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reference">Material de referencia (opcional)</label>
                <textarea
                  id="reference"
                  name="reference"
                  rows={3}
                  placeholder="..."
                  className="input-hover"
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
                <small className="help">Máx. 1000 caracteres</small>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="actions-row button-hover"
        style={{
          alignItems: 'center',
          marginTop: 20,
          position: 'relative',
          minHeight: 10,
          padding:20,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ display: 'flex', gap: 15,padding:5}}>
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
          {step < 2 && (
            <Button
              type="primary"
              className="float-button-animation next-fixed"
              disabled={sending || !validStep()}
              onClick={(e) => {
                e.preventDefault();
                if (validStep()) setStep((s) => s + 1);
              }}
              style={{ marginRight: 8 }}
            >
              Siguiente
            </Button>
          )}
        </div>
        <div style={{ justifyContent:'flex-start',padding:20}}>
        {step === 2 && onGenerateAI && (
          <Button
            type="primary"
            disabled={sending || !validStep()}
            onClick={() => {
              if (validStep()) onGenerateAI();
            }}
            style={{ marginRight: 8 }}
          >
            Generar preguntas con IA
          </Button>
        )}
        </div>
      </div>
    </form>
  );
});
