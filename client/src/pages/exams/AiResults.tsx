import { useState, type DragEvent } from 'react';
import { Alert, Button, Card, Modal, Radio, Skeleton, Space, Typography, theme } from 'antd';
import { ReloadOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import QuestionCard from '../../components/ai/QuestionCard';
import type { GeneratedQuestion } from '../../services/exams.service';
import { useExamsStore } from '../../store/examsStore';
import { useNavigate } from 'react-router-dom';
import { readJSON, saveJSON } from '../../services/storage/localStorage';

const { Title, Text } = Typography;

export type AiResultsProps = {
  subject: string;
  difficulty: string;
  createdAt?: string;
  questions: GeneratedQuestion[];
  loading?: boolean;
  error?: string | null;
  onChange: (q: GeneratedQuestion) => void;
  onRegenerateAll: () => Promise<void> | void;
  onRegenerateOne?: (q: GeneratedQuestion) => Promise<void> | void;
  onAddManual: (type: GeneratedQuestion['type']) => void;
  onSave: () => Promise<void> | void;
  onReorder: (from: number, to: number) => void;
};

export default function AiResults({
  subject,
  difficulty,
  createdAt,
  questions,
  loading,
  error,
  onChange,
  onRegenerateAll,
  onRegenerateOne,
  onAddManual,
  onSave,
  onReorder,
}: AiResultsProps) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [regenLoading, setRegenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeChoice, setTypeChoice] = useState<GeneratedQuestion['type']>('multiple_choice');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addFromQuestions = useExamsStore((s) => s.addFromQuestions);

  const total = questions.length;
  const selected = questions.filter(q => q.include).length;

  const mc = questions.filter(q => q.type === 'multiple_choice').length;
  const tf = questions.filter(q => q.type === 'true_false').length;
  const an = questions.filter(q => q.type === 'open_analysis').length;
  const ej = questions.filter(q => q.type === 'open_exercise').length;

  const examInfoStyle = {
    background: token.colorFillTertiary,
    borderLeft: `4px solid ${token.colorPrimary}`,
  } as const;

  const handleRegenerateAll = async () => {
    setRegenLoading(true);
    try {
      await onRegenerateAll();
    } finally {
      setRegenLoading(false);
    }
  };

  function optToString(opt: any): string {
    if (typeof opt === 'string') return opt;
    if (!opt || typeof opt !== 'object') return '';
    return (
      opt.text ??
      opt.label ??
      opt.content ??
      opt.option ??
      opt.value ??
      ''
    );
  }

  function optionsAsStrings(q: any): string[] {
    if (!q?.options) return [];
    if (Array.isArray(q.options)) return q.options.map(optToString).filter(Boolean);
    return [];
  }

  function letterToIndex(letter: any): number | undefined {
    const s = String(letter ?? '').trim().toLowerCase();
    const map: Record<string, number> = { a:0, b:1, c:2, d:3, e:4, f:5 };
    return s in map ? map[s] : undefined;
  }

  function numberToIndex(n: any): number | undefined {
    const v = Number(String(n ?? '').trim());
    if (!Number.isFinite(v)) return undefined;
    const i = v - 1;
    return i >= 0 ? i : undefined;
  }

  function parseBooleanAnswer(ans: any): boolean | undefined {
    if (typeof ans === 'boolean') return ans;
    const s = String(ans ?? '').trim().toLowerCase();
    if (!s) return undefined;
    if (['v', 'verdadero', 'true', 'si', 'sí', 's', '1'].includes(s)) return true;
    if (['f', 'falso', 'false', 'no', 'n', '0'].includes(s)) return false;
    return undefined;
  }

  function findCorrectIndexFromOptionsArray(q: any): number | undefined {
    if (!Array.isArray(q?.options)) return undefined;
    const byFlag = q.options.findIndex((o: any) => o?.correct === true || o?.isCorrect === true);
    return byFlag >= 0 ? byFlag : undefined;
  }

  function normalizeMCQ(q: any, idx: number) {
    const base = {
      id: q.id,
      n: idx + 1,
      source: q.id?.startsWith('manual_') ? ('manual' as const) : ('ai' as const),
      type: q.type,
      text: q.text ?? '',
    };

    const opts = optionsAsStrings(q);
    let correctIndex: number | undefined =
      q.correctOptionIndex ??
      q.correctIndex ??
      q.answerIndex ??
      undefined;

    if (correctIndex === undefined) {
      correctIndex =
        letterToIndex(q.correctOptionLetter) ??
        letterToIndex(q.answerLetter) ??
        letterToIndex(q.correct) ??
        letterToIndex(q.answer) ??
        undefined;
    }

    if (correctIndex === undefined) {
      correctIndex =
        numberToIndex(q.correctOptionNumber) ??
        numberToIndex(q.answerNumber) ??
        numberToIndex(q.correct) ??
        numberToIndex(q.answer) ??
        undefined;
    }

    if (correctIndex === undefined) {
      correctIndex = findCorrectIndexFromOptionsArray(q);
    }

    let answerText: string | undefined = (q.answer && String(q.answer).trim()) || undefined;
    if (typeof correctIndex === 'number' && Array.isArray(opts) && opts[correctIndex]) {
      answerText = opts[correctIndex]; // priorizamos el texto de la opción correcta
    } else if (!answerText && Array.isArray(opts) && opts.length) {
      const i = opts.findIndex(o => o.trim().toLowerCase() === String(q.correctOptionText ?? q.correctAnswer ?? q.solution ?? '').trim().toLowerCase());
      if (i >= 0) {
        correctIndex = i;
        answerText = opts[i];
      }
    }

    if (!answerText && typeof q.answer === 'string' && opts.length) {
      const i = opts.findIndex(o => o.trim().toLowerCase() === q.answer.trim().toLowerCase());
      if (i >= 0) {
        correctIndex = i;
        answerText = opts[i];
      }
    }

    return {
      ...base,
      options: opts,
      correctOptionIndex: typeof correctIndex === 'number' ? correctIndex : undefined,
      answer: answerText,
    };
  }

  function normalizeTrueFalse(q: any, idx: number) {
    const base = {
      id: q.id,
      n: idx + 1,
      source: q.id?.startsWith('manual_') ? ('manual' as const) : ('ai' as const),
      type: q.type,
      text: q.text ?? '',
    };

    let bool =
      parseBooleanAnswer(q.answer) ??
      parseBooleanAnswer(q.correctBoolean) ??
      parseBooleanAnswer(q.correct) ??
      parseBooleanAnswer(q.truth) ??
      parseBooleanAnswer(q.isTrue) ??
      undefined;

    return {
      ...base,
      correctBoolean: bool,
      answer: typeof bool === 'boolean' ? (bool ? 'Verdadero' : 'Falso') : (q.answer ?? undefined),
    };
  }

  function normalizeOpen(q: any, idx: number) {
    const base = {
      id: q.id,
      n: idx + 1,
      source: q.id?.startsWith('manual_') ? ('manual' as const) : ('ai' as const),
      type: q.type,
      text: q.text ?? '',
    };

    const answer =
      q.expectedAnswer ??
      q.answer ??
      q.modelAnswer ??
      q.sampleAnswer ??
      q.solution ??
      q.correct ??
      undefined;

    return { ...base, expectedAnswer: answer, answer };
  }

  function mapQuestionForPrint(q: GeneratedQuestion, idx: number) {
    if (q.type === 'multiple_choice') return normalizeMCQ(q, idx);
    if (q.type === 'true_false') return normalizeTrueFalse(q, idx);
    return normalizeOpen(q, idx);
  }

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await onSave();
      const summary = addFromQuestions({ title: subject || 'Examen', questions, publish: true });

      const printable = {
        examId: summary.id,
        title: summary.title,
        subject: subject || summary.className || '—',
        teacher: '—',
        createdAt: summary.createdAt || new Date().toISOString(),
        questions: questions.filter(q => q.include).map(mapQuestionForPrint),
      };
      saveJSON(`exam:content:${summary.id}`, printable);

      const index = readJSON<string[]>(`exam:content:index`) || [];
      if (!index.includes(summary.id)) {
        index.push(summary.id);
        saveJSON(`exam:content:index`, index);
      }

      navigate('/exams', { replace: true });
    } finally {
      setSaveLoading(false);
    }
  };

  const openTypeModal = () => {
    setTypeChoice('multiple_choice');
    setTypeModalOpen(true);
  };

  const confirmAddManual = () => {
    onAddManual(typeChoice);
    setTypeModalOpen(false);
  };

  const handleDragStart = (index: number) => () => setDragIndex(index);
  const handleDragOver = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onReorder(dragIndex, index);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="ai-results-wrap" style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG,color: token.colorText }}>
      <div className="ai-results card-like" style={{  background: token.colorBgContainer}}>
        <Title level={3} className="!mb-4 -full text-center" style={{ background: token.colorBgContainer, }}>
          Revisar Examen: <span style={{ color: token.colorText }}>{subject}</span>
        </Title>

        <div className="flex flex-wrap justify-center items-center gap-4 p-5 rounded-md my-2 text-center" style={examInfoStyle}>
          <div className="flex flex-col">
            <Text type="secondary" >Materia</Text>
            <Text strong style={{ color: token.colorText }}>{subject}</Text>
          </div>
          <div className="flex flex-col">
            <Text type="secondary">Total</Text>
            <Text strong>{total}</Text>
          </div>
          <div className="flex flex-col">
            <Text type="secondary">Dificultad</Text>
            <Text strong>{difficulty}</Text>
          </div>
          <div className="flex flex-col">
            <Text type="secondary">Seleccionadas</Text>
            <Text strong>{selected}</Text>
          </div>
          {createdAt && (
            <div className="flex flex-col">
              <Text type="secondary">Fecha de Creación</Text>
              <Text strong>{createdAt}</Text>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <Card size="small" style={{ background: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }}>
            <Text strong>MC:</Text> <Text>{mc}</Text>
          </Card>
          <Card size="small" style={{ background: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }}>
            <Text strong>VF:</Text> <Text>{tf}</Text>
          </Card>
          <Card size="small" style={{ background: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }}>
            <Text strong>AN:</Text> <Text>{an}</Text>
          </Card>
          <Card size="small" style={{ background: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }}>
            <Text strong>EJ:</Text> <Text>{ej}</Text>
          </Card>
        </div>

        {error && <Alert type="error" showIcon className="mb-4" message={error} />}
        {loading ? (
          <Card style={{ background: token.colorBgElevated, borderColor: token.colorBorderSecondary }}>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
        ) : (
          <Space direction="vertical" className="w-full" size={0}>
            {questions.map((q, i) => (
              <div
                key={q.id}
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDragEnd={handleDragEnd}
                style={{ cursor: 'move' }}
              >
                <QuestionCard
                  index={i}
                  question={q}
                  onChange={onChange}
                  onRegenerate={!q.id?.startsWith('manual_') ? onRegenerateOne : undefined}
                  disabled={q.type === 'multiple_choice' || q.type === 'true_false'}
                />
              </div>
            ))}
          </Space>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-1 mt-3">
          <div className="flex gap-1">
            <Button icon={<ReloadOutlined />} loading={regenLoading} onClick={handleRegenerateAll} aria-label="Regenerar Preguntas">
              Regenerar
            </Button>
            <Button icon={<PlusOutlined />} onClick={openTypeModal} aria-label="Añadir Pregunta Manual">
              Añadir manual
            </Button>
          </div>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveLoading}
            onClick={handleSave}
            aria-label="Guardar y Finalizar"
          >
            Guardar y Finalizar
          </Button>
        </div>

        <Modal
          title="Añadir pregunta manual"
          open={typeModalOpen}
          onOk={confirmAddManual}
          onCancel={() => setTypeModalOpen(false)}
          okText="Añadir"
          cancelText="Cancelar"
        >
          <Radio.Group
            value={typeChoice}
            onChange={(e) => setTypeChoice(e.target.value)}
            className="flex flex-col gap-2"
          >
            <Radio value="multiple_choice">Selección múltiple</Radio>
            <Radio value="true_false">Verdadero/Falso</Radio>
            <Radio value="open_analysis">Análisis abierto</Radio>
            <Radio value="open_exercise">Ejercicio abierto</Radio>
          </Radio.Group>
        </Modal>
      </div>
    </div>
  );
}
