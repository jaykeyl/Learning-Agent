import { Button, Table, Tag, Tooltip, Typography, theme, Modal, DatePicker, Radio, message, Space, Popconfirm } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, EditOutlined, UploadOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useExamsStore, type ExamSummary, type ExamsState } from '../../store/examsStore';

const { Text } = Typography;

type Props = {
  data: ExamSummary[];
  onEdit?: (exam?: ExamSummary) => void;
};

function fmt(dateIso?: string) {
  if (!dateIso) return '—';
  try {
    return new Date(dateIso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return '—';
  }
}

function StatusVisibility({ exam }: { exam: ExamSummary }) {
  const isHidden = exam.visibility === 'hidden';
  if (isHidden) {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
        <Tag color="error">Oculto</Tag>
        <span className="text-[12px] text-[var(--app-color-text-tertiary)]">No visible al alumnado</span>
      </div>
    );
  }
  if (exam.status === 'published') {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
        <Tag color="success">Publicado</Tag>
        <span className="text-[12px] text-[var(--app-color-text-tertiary)]">Visible • Publicado: {fmt(exam.publishedAt)}</span>
      </div>
    );
  }
  if (exam.status === 'scheduled') {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
        <Tag color="processing">Programado</Tag>
        <span className="text-[12px] text-[var(--app-color-text-tertiary)]">Visible • Programado: {fmt(exam.publishedAt)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap" style={{ lineHeight: 1.2 }}>
      <Tag color="default">Borrador</Tag>
      <span className="text-[12px] text-[var(--app-color-text-tertiary)]">Visible • Aún no publicado</span>
    </div>
  );
}

function downloadExamPdf(exam: ExamSummary) {
  const w = window.open('', '_blank');
  if (!w) return;
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${exam.title}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:24px}
          h1{margin:0 0 8px 0}
          .meta{color:#666;margin-bottom:16px}
          .box{border:1px solid #ddd;border-radius:8px;padding:16px}
          .row{margin:6px 0}
        </style>
      </head>
      <body>
        <h1>${exam.title}</h1>
        <div class="meta">Creado: ${fmt(exam.createdAt)} • Preguntas: ${exam.totalQuestions}</div>
        <div class="box">
          <div class="row">Estado: ${exam.status}</div>
          <div class="row">Visibilidad: ${exam.visibility}</div>
          <div class="row">Fecha publicación/programación: ${fmt(exam.publishedAt)}</div>
          <div class="row">Selección múltiple: ${exam.counts.multiple_choice}</div>
          <div class="row">Verdadero/Falso: ${exam.counts.true_false}</div>
          <div class="row">Análisis abierto: ${exam.counts.open_analysis}</div>
          <div class="row">Ejercicio abierto: ${exam.counts.open_exercise}</div>
        </div>
        <script>window.onload=()=>window.print()</script>
      </body>
    </html>
  `;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function ExamTable({ data, onEdit }: Props) {
  const toggleVisibility = useExamsStore((s: ExamsState) => s.toggleVisibility);
  const setVisibility = useExamsStore((s: ExamsState) => s.setVisibility);
  const setStatus = useExamsStore((s: ExamsState) => s.setStatus);
  const removeExam = useExamsStore((s: ExamsState) => s.removeExam);
  const { token } = theme.useToken();

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleAt, setScheduleAt] = useState<Dayjs | null>(null);
  const [target, setTarget] = useState<ExamSummary | null>(null);

  const openPublishModal = (exam: ExamSummary) => {
    setTarget(exam);
    setPublishMode('now');
    setScheduleAt(null);
    setPublishOpen(true);
  };

  const handleConfirmPublish = () => {
    if (!target) return;
    if (publishMode === 'now') {
      setStatus(target.id, 'published', new Date().toISOString());
      setVisibility(target.id, 'visible');
      message.success('Examen publicado');
    } else if (publishMode === 'schedule') {
      if (!scheduleAt) {
        message.warning('Selecciona una fecha y hora');
        return;
      }
      setStatus(target.id, 'scheduled', scheduleAt.toDate().toISOString());
      setVisibility(target.id, 'visible');
      message.success('Examen programado');
    } else {
      setStatus(target.id, 'draft', undefined);
      message.success('Examen guardado como borrador');
    }
    setPublishOpen(false);
    setTarget(null);
  };

  const columns: ColumnsType<ExamSummary> = [
    {
      title: <span style={{ display: 'block', textAlign: 'center', fontSize: token.fontSizeLG, fontWeight: 600 }}>Título de Examen</span>,
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div style={{ textAlign:'center' }}>
          <Text strong style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }} ellipsis>
            {title}
          </Text>
          <div style={{ textAlign: 'center' }} className="text-[12px] text-[var(--app-color-text-tertiary)]">
            {record.totalQuestions} preguntas • Creado: {fmt(record.createdAt)}
          </div>
        </div>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
      ellipsis: true,
    },
    {
      title: <span style={{ display: 'block', textAlign: 'center', fontSize: token.fontSizeLG, fontWeight: 600 }}>Estado / Visibilidad</span>,
      key: 'status_visibility',
      align: 'center',
      render: (_, record) => <StatusVisibility exam={record} />,
      sorter: (a, b) => {
        const v = a.visibility.localeCompare(b.visibility);
        if (v !== 0) return v;
        return a.status.localeCompare(b.status);
      },
      ellipsis: true,
    },
    {
      title: <span style={{ display: 'block', textAlign: 'center', fontSize: token.fontSizeLG, fontWeight: 600 }}>Acciones</span>,
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size={6} wrap={false} style={{ whiteSpace: 'nowrap' }}>
          <Tooltip title="Editar">
            <Button type="text" style={{ paddingInline: 6 }} icon={<EditOutlined style={{ fontSize: 18 }} />} onClick={() => onEdit?.(record)} aria-label="Editar" />
          </Tooltip>
          <Tooltip title="Publicar / Programar / Borrador">
            <Button type="text" style={{ paddingInline: 6 }} icon={<UploadOutlined style={{ fontSize: 18 }} />} onClick={() => openPublishModal(record)} aria-label="Estado" />
          </Tooltip>
          <Tooltip title={record.visibility === 'visible' ? 'Hacer privado' : 'Hacer público'}>
            <Button
              type="text"
              style={{ paddingInline: 6 }}
              icon={record.visibility === 'visible' ? <EyeInvisibleOutlined style={{ fontSize: 18 }} /> : <EyeOutlined style={{ fontSize: 18 }} />}
              onClick={() => toggleVisibility(record.id)}
              aria-label="Visibilidad"
            />
          </Tooltip>
          <Tooltip title="Descargar PDF">
            <Button type="text" style={{ paddingInline: 6 }} icon={<FilePdfOutlined style={{ fontSize: 18 }} />} onClick={() => downloadExamPdf(record)} aria-label="Descargar PDF" />
          </Tooltip>
          <Popconfirm
            title="Eliminar examen"
            description="Esta acción no se puede deshacer."
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => { removeExam(record.id); message.success('Examen eliminado'); }}
          >
            <Tooltip title="Eliminar">
              <Button type="text" danger style={{ paddingInline: 6 }} icon={<DeleteOutlined style={{ fontSize: 18 }} />} aria-label="Eliminar" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        rowKey="id"
        className="shadow-sm rounded-lg"
        style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` ,padding:10 }}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{
          emptyText: 'Sin datos',
          triggerDesc: 'Ordenar descendente',
          triggerAsc: 'Ordenar ascendente',
          cancelSort: 'Quitar orden',
          sortTitle: 'Ordenar',
        }}
      />
      <Modal
        title="Publicación del examen"
        open={publishOpen}
        onOk={handleConfirmPublish}
        onCancel={() => setPublishOpen(false)}
        okText={publishMode === 'now' ? 'Publicar' : publishMode === 'schedule' ? 'Programar' : 'Guardar como borrador'}
        cancelText="Cancelar"
      >
        <Radio.Group value={publishMode} onChange={(e) => setPublishMode(e.target.value)} className="flex flex-col gap-2">
          <Radio value="now">Publicar ahora</Radio>
          <Radio value="schedule">Programar</Radio>
          <Radio value="draft">Borrador</Radio>
        </Radio.Group>
        {publishMode === 'schedule' && (
          <div className="mt-3">
            <DatePicker showTime style={{ width: '100%' }} value={scheduleAt as any} onChange={(d) => setScheduleAt(d)} />
          </div>
        )}
      </Modal>
    </>
  );
}
