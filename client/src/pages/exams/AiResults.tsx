import { useState, type DragEvent, type CSSProperties } from 'react';
import {
  Alert,
  Button,
  Card,
  Modal,
  Radio,
  Skeleton,
  Space,
  Typography,
  theme,
  message,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  SaveOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { PromptViewer } from '../../components/exams/PromptViewer';
import QuestionCard from '../../components/ai/QuestionCard';
import type { GeneratedQuestion } from '../../services/exams.service';

const { Title, Text } = Typography;

export type AiResultsProps = {
  subject: string;
  difficulty: string;
  createdAt?: string;
  reference?: string;
  questions: GeneratedQuestion[];
  loading?: boolean;
  error?: string | null;
  onChange: (q: GeneratedQuestion) => void;
  onRegenerateAll: () => Promise<void> | void;
  onRegenerateOne?: (q: GeneratedQuestion) => Promise<void> | void;
  onAddManual: (type: GeneratedQuestion['type']) => void;
  onSave: () => Promise<void> | void;
  onReorder: (from: number, to: number) => void;
  canSave?: boolean;
  saveDisabledReason?: string;
};

export default function AiResults(props: AiResultsProps) {
  const {
    subject,
    difficulty,
    createdAt,
    reference,
    questions,
    loading,
    error,
    onChange,
    onRegenerateAll,
    onRegenerateOne,
    onAddManual,
    onSave,
    onReorder,
    canSave = true,
    saveDisabledReason,
  } = props;

  const { token } = theme.useToken();
  const [regenLoading, setRegenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeChoice, setTypeChoice] =
    useState<GeneratedQuestion['type']>('multiple_choice');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

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

  const rawContext = (reference ?? '').trim();
  const contextItems = (() => {
    if (!rawContext) return [] as string[];
    let normalized = rawContext.replace(/^Í?indices?:\s*/i, '').trim();
    try {
      const arr = JSON.parse(rawContext);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {}
    const parts = normalized
      .split(/\r?\n|,|;|\||•|\u2022/g)
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of parts) if (!seen.has(p)) { seen.add(p); out.push(p); }
    return out.length ? out : [rawContext];
  })();

  const contextCount = contextItems.length;
  const handleCopyContext = async () => {
    try {
      await navigator.clipboard.writeText(rawContext);
      message.success('Contexto copiado al portapapeles');
    } catch {
      message.error('No se pudo copiar el contexto');
    }
  };

  const total = questions.length;
  const selected = questions.filter((q) => q.include).length;
  const mc = questions.filter((q) => q.type === 'multiple_choice').length;
  const tf = questions.filter((q) => q.type === 'true_false').length;
  const an = questions.filter((q) => q.type === 'open_analysis').length;
  const ej = questions.filter((q) => q.type === 'open_exercise').length;

  const examInfoStyle = {
    background: token.colorFillTertiary,
    borderLeft: `4px solid ${token.colorPrimary}`,
  } as const;

  const handleRegenerateAll = async () => {
    setRegenLoading(true);
    try { await onRegenerateAll(); } finally { setRegenLoading(false); }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try { await onSave(); } finally { setSaveLoading(false); }
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

  const saveDisabled = !canSave || selected === 0;
  const saveDisabledTitle =
    selected === 0
      ? 'Selecciona al menos una pregunta'
      : !canSave
      ? saveDisabledReason || 'Falta contexto de curso/período'
      : 'Guardar y finalizar el examen';

  return (
    <div
      className="ai-results-wrap"
      style={{
        ...cssVars,
        background: token.colorBgLayout,
        padding: 12,
        borderRadius: token.borderRadiusLG,
        color: token.colorText,
      }}
    >
      <div className="ai-results card-like" style={{ background: token.colorBgContainer }}>
        <Title level={3} className="!mb-4 w-full text-center">
          Revisar Examen: <span style={{ color: token.colorText }}>{subject}</span>
        </Title>

        <div
          className="flex flex-wrap justify-center items-center gap-4 p-5 rounded-md my-2 text-center"
          style={examInfoStyle}
          aria-label="Resumen del examen generado"
        >
          <div className="flex flex-col">
            <Text type="secondary">Materia</Text>
            <Text strong>{subject}</Text>
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
          <div className="flex flex-col">
            <Text type="secondary">Contexto</Text>
            <div className="flex items-center gap-2">
              <Text strong>{contextItems.length} índice{contextCount === 1 ? '' : 's'}</Text>
              <Button type="link" size="small" onClick={() => setContextOpen(true)} disabled={!rawContext}>
                Ver
              </Button>
              <Button size="small" onClick={handleCopyContext} disabled={!rawContext}>
                Copiar
              </Button>
            </div>
          </div>
        </div>

        {!canSave && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message="Esta página necesita un curso."
            description={saveDisabledReason || 'Vuelve a Gestión de exámenes para seleccionar el curso y período correctos.'}
          />
        )}

        <div className="flex flex-wrap justify-center gap-3 mb-6" aria-label="Conteo por tipo">
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
              <QuestionCard
                key={q.id || i}
                index={i}
                question={q}
                onChange={onChange}
                onRegenerate={onRegenerateOne}
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
              />
            ))}

            <div className="flex flex-wrap justify-between items-center gap-2 py-4">
              <div className="flex gap-8">
                <Button
                  icon={<ReloadOutlined />}
                  loading={regenLoading}
                  onClick={handleRegenerateAll}
                >
                  Regenerar conjunto
                </Button>
                <Button icon={<PlusOutlined />} onClick={openTypeModal}>
                  Añadir manual
                </Button>
                <Button
                  icon={<QuestionCircleOutlined />}
                  type="link"
                  onClick={() => setShowPromptViewer(true)}
                >
                  Ver prompt
                </Button>
              </div>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saveLoading}
                disabled={saveDisabled}
                onClick={handleSave}
                title={saveDisabledTitle}
              >
                Guardar y Finalizar
              </Button>
            </div>
          </Space>
        )}

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

        <Modal
          title="Contexto utilizado"
          open={contextOpen}
          onCancel={() => setContextOpen(false)}
          footer={null}
          width={700}
        >
          {contextItems.length > 1 ? (
            <div>
              <Typography.Paragraph type="secondary">
                Se utilizaron {contextCount} índice{contextCount === 1 ? '' : 's'}:
              </Typography.Paragraph>
              <ul style={{ paddingLeft: 18 }}>
                {contextItems.map((item, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <Typography.Text>{item}</Typography.Text>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rawContext}</pre>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button onClick={handleCopyContext}>Copiar</Button>
            <Button type="primary" onClick={() => setContextOpen(false)}>Cerrar</Button>
          </div>
        </Modal>

        <PromptViewer open={showPromptViewer} onClose={() => setShowPromptViewer(false)} />
      </div>
    </div>
  );
}
