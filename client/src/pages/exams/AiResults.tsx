import { useState, type DragEvent } from 'react';
import {Alert,Button,Card,Modal,Radio,Skeleton,Space,Typography,theme,} from 'antd';
import {ReloadOutlined,PlusOutlined,SaveOutlined,QuestionCircleOutlined,} from '@ant-design/icons';
import { PromptViewer } from '../../components/exams/PromptViewer';
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
  const [showPromptViewer, setShowPromptViewer] = useState(false);

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
        questions: questions.filter(q => q.include),
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
    <div className="ai-results-wrap" style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG, color: token.colorText }}>
      <div className="ai-results card-like" style={{ background: token.colorBgContainer }}>
        <Title level={3} className="!mb-4 -full text-center">
          Revisar Examen: <span style={{ color: token.colorText }}>{subject}</span>
        </Title>

        <div className="flex flex-wrap justify-center items-center gap-4 p-5 rounded-md my-2 text-center" style={examInfoStyle}>
          <div className="flex flex-col"><Text type="secondary">Materia</Text><Text strong>{subject}</Text></div>
          <div className="flex flex-col"><Text type="secondary">Total</Text><Text strong>{total}</Text></div>
          <div className="flex flex-col"><Text type="secondary">Dificultad</Text><Text strong>{difficulty}</Text></div>
          <div className="flex flex-col"><Text type="secondary">Seleccionadas</Text><Text strong>{selected}</Text></div>
          {createdAt && (
            <div className="flex flex-col">
              <Text type="secondary">Fecha de Creación</Text>
              <Text strong>{createdAt}</Text>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <Card size="small"><Text strong>MC:</Text> <Text>{mc}</Text></Card>
          <Card size="small"><Text strong>VF:</Text> <Text>{tf}</Text></Card>
          <Card size="small"><Text strong>AN:</Text> <Text>{an}</Text></Card>
          <Card size="small"><Text strong>EJ:</Text> <Text>{ej}</Text></Card>
        </div>

        {error && <Alert type="error" showIcon className="mb-4" message={error} />}
        {loading ? (
          <Card><Skeleton active paragraph={{ rows: 4 }} /></Card>
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
            <Button icon={<ReloadOutlined />} loading={regenLoading} onClick={handleRegenerateAll}>
              Regenerar
            </Button>
            <Button icon={<PlusOutlined />} onClick={openTypeModal}>
              Añadir manual
            </Button>
          </div>
          <div className="flex gap-1 justify-end">
            <Button
              icon={<QuestionCircleOutlined />}
              onClick={() => setShowPromptViewer(true)}
              aria-label="Ver Prompt"
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveLoading}
              onClick={handleSave}
            >
              Guardar y Finalizar
            </Button>
          </div>
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

        <PromptViewer open={showPromptViewer} onClose={() => setShowPromptViewer(false)} />
      </div>
    </div>
  );
}
