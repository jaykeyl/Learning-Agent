import { useState , type DragEvent} from 'react';
import { Card, Typography, Space, Radio, Checkbox, Button, Image, Tag, Divider, theme } from 'antd';
import { EditOutlined, SaveOutlined, ReloadOutlined} from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import type { GeneratedQuestion } from '../../services/exams.service';
import { palette } from '../../theme';

const { Text, Paragraph } = Typography;

export type QuestionCardProps = {
  index: number;
  question: GeneratedQuestion;
  onChange: (q: GeneratedQuestion) => void;
  onRegenerate?: (q: GeneratedQuestion) => void;

  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: () => void;
  isDragging?: boolean;
  disabled?: boolean;
};

export default function QuestionCard({
  index,
  question,
  onChange,
  onRegenerate,

  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  disabled = false,
}: QuestionCardProps) {
  const { token } = theme.useToken();
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(question.text);
  const [selected, setSelected] = useState<string | undefined>();

  const typeLabel =
    question.type === 'multiple_choice' ? 'Selección Múltiple'
      : question.type === 'true_false' ? 'Verdadero/Falso'
      : question.type === 'open_exercise' ? 'Ejercicio'
      : 'Análisis';

  const typeAccent =
    question.type === 'multiple_choice' ? palette.P1
      : question.type === 'true_false' ? palette.P2
      : question.type === 'open_exercise' ? palette.P3
      : palette.P0;

  const handleInclude = (checked: boolean) => onChange({ ...question, include: checked });
  const handleSave = () => { setEditing(false); onChange({ ...question, text: draftText }); };
  const handleRadio = (e: RadioChangeEvent) => setSelected(e.target.value);

  return (
    <div
      draggable={!!draggable}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        if (onDragOver) {
          e.preventDefault();
          onDragOver(e);
        }
      }}
      onDrop={(e) => {
        if (onDrop) {
          e.preventDefault();
          onDrop();
        }
      }}
      aria-grabbed={!!isDragging}
      style={{
        opacity: isDragging ? 0.85 : 1,
        transition: 'opacity 120ms ease',
      }}
    >
      <Card
        className="transition-all duration-300 hover:-translate-y-[3px] shadow-sm"
        style={{
          borderLeft: `4px solid ${typeAccent}`,
          minHeight: 160,
          padding: 0,
          margin:0,
        }}
      >
        <div
          className="flex items-center justify-between mb-3 py-3"
          style={{ minHeight: 5 , padding:0 }}>
          <Space>
            {onRegenerate && (
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => onRegenerate(question)}
                aria-label={`Regenerar pregunta ${index + 1}`}
              >
                Regenerar
              </Button>
            )}

            {!editing ? (
              <Button
                size="small"
                type="dashed"
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
                aria-label={`Editar pregunta ${index + 1}`}
              >
                Editar
              </Button>
            ) : (
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                aria-label={`Guardar cambios de la pregunta ${index + 1}`}
                style={{ background: typeAccent }}
              >
                Guardar
              </Button>
            )}

            <div className="inline-flex items-center">
              <Checkbox
                checked={question.include}
                onChange={(e) => handleInclude(e.target.checked)}
                aria-label={`Incluir pregunta ${index + 1} en el examen final`}
                style={{padding:1}}
              />
              <Text className="text-[15px]" style={{ color: token.colorTextSecondary }}> Incluir</Text>
            </div>
            
          </Space>
        </div>

        {!editing ? (
          <Paragraph className="mb-4 !text-[15px]">{question.text}</Paragraph>
        ) : (
          <textarea
            className="w-full min-h-[110px] p-3 rounded-md border focus:outline-none focus:ring-2"
            style={{ borderColor: token.colorBorderSecondary, outlineColor: typeAccent }}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            aria-label={`Editar texto de la pregunta ${index + 1}`}
          />
        )}

        {question.type === 'multiple_choice' && Array.isArray(question.options) && question.options.length > 0 && (
          <Radio.Group onChange={handleRadio} value={selected} className="w-full">
            <Space direction="vertical" className="w-full">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1 rounded-md">
                  <Radio value={`${i}`} disabled={disabled} />
                  <Text className="flex-1">{opt}</Text>
                </div>
              ))}
            </Space>
          </Radio.Group>
        )}

        {question.type === 'true_false' && (
          <Radio.Group onChange={handleRadio} value={selected} className="w-full">
            <Space direction="vertical" className="w-full">
              <div className="flex items-center gap-1 px-3 py-0 rounded-md">
                <Radio value="V" disabled={disabled} />
                <Text className="flex-1">Verdadero</Text>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-md">
                <Radio value="F" disabled={disabled} />
                <Text className="flex-1">Falso</Text>
              </div>
            </Space>
          </Radio.Group>
        )}

        {question.type === 'open_exercise' && (
          <div className="my-1 rounded-md" style={{ background: token.colorFillTertiary, borderLeft: `3px solid ${typeAccent}` }}>
            <div className="p-3">
              <Text italic style={{ color: token.colorTextSecondary }}>
                <strong>Espacio para solución:</strong> [El estudiante escribirá su respuesta aquí]
              </Text>
            </div>
          </div>
        )}

        {question.type === 'open_analysis' && 'imageUrl' in question && (question as any).imageUrl && (
          <div className="my-2 p-2 rounded-md" style={{ background: token.colorFillTertiary }}>
            <Image src={(question as any).imageUrl} alt="Recurso de análisis" />
          </div>
        )}

        <Divider style={{ marginTop: 5, marginBottom: 5 }} />
        <Space wrap>
          <Tag style={{ borderColor: 'transparent' }}>#{index + 1}</Tag>
          <Tag style={{ borderColor: 'transparent' }}>{typeLabel}</Tag>
        </Space>
      </Card>
    </div>
  );
}
