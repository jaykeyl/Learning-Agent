import { Modal, Table, Alert, Typography, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

type RowIn = Record<string, any> & {
  nombres: string;
  apellidos: string;
  codigo: number | string;
};

type Props = {
  open: boolean;
  data: RowIn[];
  duplicates: string[];
  meta: { fileName: string; totalRows: number };
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function StudentPreviewModal({
  open, data, duplicates, meta, loading, onCancel, onConfirm,
}: Props) {
  const dupSet = new Set(duplicates.map((d) => String(d).trim().toLowerCase()));

  const hasCorreo = data.some((r) => 'correo' in r && String(r.correo || '').trim() !== '');

  const coreKeys = new Set(['nombres', 'apellidos', 'codigo', 'correo']);
  const extraCols = Array.from(
    data.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => {
        const nk = k.trim();
        if (!coreKeys.has(nk)) acc.add(nk);
      });
      return acc;
    }, new Set<string>())
  );

  const toTitleCase = (s: any) => {
    const str = String(s ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return str.replace(/(^|\s|[-_/])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
  };

  const columns: ColumnsType<RowIn> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      render: (v: any) =>
        dupSet.has(String(v || '').trim().toLowerCase())
          ? <Text type="danger">{String(v)} (duplicado)</Text>
          : <Text>{String(v)}</Text>,
      width: 100,
    },
    { title: 'Nombre', dataIndex: 'nombres', key: 'nombres', render: (v: any) => <Text>{toTitleCase(v)}</Text> },
    { title: 'Apellido', dataIndex: 'apellidos', key: 'apellidos', render: (v: any) => <Text>{toTitleCase(v)}</Text> },
    ...(hasCorreo ? [{ title: 'Correo', dataIndex: 'correo', key: 'correo' } as const] : []),
    ...extraCols.map((k) => ({
      title: k,
      dataIndex: k,
      key: k,
    })),
  ];

  return (
    <Modal
      centered
      open={open}
      title="Previsualización de estudiantes"
      okText="Confirmar envío"
      cancelText="Cancelar"
      onCancel={onCancel}
      onOk={onConfirm}
      confirmLoading={loading}
      width={900}
    >
      <div className="space-y-4 px-1 sm:px-2">
        <Alert type="info" showIcon message={
          <Descriptions
            size="small"
            colon
            column={{ xs: 1, sm: 1, md: 2 }}
            items={[
              {
                key: 'summary',
                label: 'Resumen',
                children: (
                  <div className="space-y-1">
                    <div><b>Archivo:</b> {meta.fileName}</div>
                    <div><b>Filas detectadas:</b> {String(meta.totalRows)}</div>
                    {duplicates.length > 0 && (
                      <div><b>Duplicados:</b> <Text type="danger">{duplicates.join(', ')}</Text></div>
                    )}
                  </div>
                ),
              },
              {
                key: 'note',
                label: 'Nota',
                children: (
                  <span>
                    Al confirmar se inscribirán. Los duplicados por código se omiten.
                  </span>
                ),
              },
            ]}
          />
        }/>
        <Table
          className="mt-3"
          size="small"
          rowKey={(_, i) => String(i)}
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 8 }}
          bordered
        />
      </div>
    </Modal>
  );
}
