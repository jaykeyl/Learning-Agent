import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Button,
  Typography,
  Alert,
  Tabs,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Tag,
  Input,
  Select,
  Pagination,
  Tooltip,
  message,
  Skeleton,
  Empty,
  Progress,
  Drawer,
  Grid,
  theme as antTheme
} from 'antd';
import {
  CloseOutlined,
  FileTextOutlined,
  DownloadOutlined,
  SyncOutlined,
  SearchOutlined,
  CopyOutlined,
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useThemeStore } from '../../store/themeStore';
import type { Document, DocumentExtractedData } from '../../interfaces/documentInterface';
import { useDocuments } from '../../hooks/useDocuments';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { useBreakpoint } = Grid;

// Constants
const MIN_DRAWER_HEIGHT = 220;
const MAX_DRAWER_HEIGHT_RATIO = 0.98;
const INITIAL_DRAWER_HEIGHT_RATIO = 0.75;
const DEFAULT_PAGE_SIZE = 5;
const MAX_SEARCH_DISPLAY_LENGTH = 15;

interface DocumentDataSidebarProps {
  document: Document | null;
  onClose: () => void;
  visible: boolean;
}

export const DocumentDataSidebar: React.FC<DocumentDataSidebarProps> = ({ document, onClose, visible }) => {
  const { getDocumentExtractedData, generateDocumentEmbeddings, extractedDataLoading, extractedDataError } = useDocuments();

  const theme = useThemeStore((state: { theme: string }) => state.theme);
  const isDark = theme === 'dark';
  const { token } = antTheme.useToken();

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // bottom-sheet (mobile) height in px
  const initialHeight = Math.round(window.innerHeight * INITIAL_DRAWER_HEIGHT_RATIO);
  const [drawerHeight, setDrawerHeight] = useState<number>(initialHeight);

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(drawerHeight);

  // extracted data state
  const [extractedData, setExtractedData] = useState<DocumentExtractedData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('metadata');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chunkTypeFilter, setChunkTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [retryCount, setRetryCount] = useState<number>(0);

  const documentId = document?.id;
  const isLoading = documentId ? extractedDataLoading[documentId] || false : false;
  const error = documentId ? extractedDataError[documentId] || null : null;

  const loadExtractedData = useCallback(async () => {
    if (!document?.id) {
      setExtractedData(null);
      return;
    }
    try {
      const data = await getDocumentExtractedData(document.id);
      setExtractedData(data);
    } catch (err) {
      console.error('Error loading extracted data:', err);
    }
  }, [document?.id, getDocumentExtractedData]);

  useEffect(() => {
    if (document?.id && visible) {
      loadExtractedData();
    } else {
      setExtractedData(null);
      setSearchTerm('');
      setChunkTypeFilter('all');
      setCurrentPage(1);
    }
  }, [document?.id, visible, loadExtractedData]);

  // copy to clipboard util
  const copyToClipboard = useCallback(async (text: string, label = 'Texto') => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} copiado al portapapeles`);
    } catch {
      message.error('Error al copiar al portapapeles');
    }
  }, []);

  const retryLoadData = useCallback(async () => {
    if (!document?.id) return;
    setRetryCount((p) => p + 1);
    try {
      const data = await getDocumentExtractedData(document.id);
      setExtractedData(data);
      message.success('Datos recargados exitosamente');
    } catch (err) {
      console.error('Error reloading data:', err);
      message.error('Error al recargar los datos');
    }
  }, [document?.id, getDocumentExtractedData]);

  // filtering + pagination
  const filteredChunks = useMemo(() => {
    if (!extractedData?.chunks) return [];
    const q = searchTerm.trim().toLowerCase();
    return extractedData.chunks.filter((chunk) => {
      const matchQ = !q || chunk.content.toLowerCase().includes(q);
      const matchType = chunkTypeFilter === 'all' || chunk.type === chunkTypeFilter;
      return matchQ && matchType;
    });
  }, [extractedData?.chunks, searchTerm, chunkTypeFilter]);

  useEffect(() => setCurrentPage(1), [searchTerm, chunkTypeFilter]);

  const paginatedChunks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChunks.slice(start, start + pageSize);
  }, [filteredChunks, currentPage, pageSize]);

  const chunkTypes = useMemo(() => (extractedData?.chunks ? Array.from(new Set(extractedData.chunks.map((c) => c.type))) : []), [extractedData?.chunks]);

  const handleGenerateEmbeddings = useCallback(async () => {
    if (!document?.id) return;
    try {
      await generateDocumentEmbeddings(document.id);
      const data = await getDocumentExtractedData(document.id);
      setExtractedData(data);
      message.success('Embeddings generados');
    } catch (err) {
      console.error('Error generating embeddings:', err);
      message.error('Error al generar embeddings');
    }
  }, [document?.id, generateDocumentEmbeddings, getDocumentExtractedData]);

  const handleExportText = useCallback(() => {
    if (!extractedData) return;
    const txt = extractedData.chunks.map((c) => c.content).join('\n\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${extractedData.metadata.title || extractedData.metadata.fileName || 'documento'}_extraido.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [extractedData]);

  // helper
  const ActionButtons = () => {
    const btnSize = isMobile ? 'small' : 'small';

    return (
      <>
        <Tooltip title="Copiar todo el texto">
          <Button
            type="default"
            icon={<CopyOutlined />}
            onClick={() => extractedData && copyToClipboard(extractedData.chunks.map((c) => c.content).join('\n\n'), 'Texto completo')}
            size={btnSize}
            aria-label="Copiar todo"
          >
            Copiar Todo
          </Button>
        </Tooltip>

        <Tooltip title="Exportar como archivo de texto">
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleExportText}
            size={btnSize}
            aria-label="Exportar"
          >
            Exportar
          </Button>
        </Tooltip>

        <Tooltip title="Generar embeddings para búsqueda semántica">
          <Button
            type="primary"
            icon={<SyncOutlined spin={isLoading} />}
            onClick={handleGenerateEmbeddings}
            loading={isLoading}
            size={btnSize}
            aria-label="Generar embeddings"
          >
            Embeddings
          </Button>
        </Tooltip>
      </>
    );
  };


  useEffect(() => {
    const onResize = () => {
      const newMax = Math.round(window.innerHeight * MAX_DRAWER_HEIGHT_RATIO);
      setDrawerHeight((h) => Math.max(MIN_DRAWER_HEIGHT, Math.min(newMax, h)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = drawerHeight;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY; // upward -> positive
      const candidate = Math.round(startHeightRef.current + delta);
      const bounded = Math.max(MIN_DRAWER_HEIGHT, Math.min(Math.round(window.innerHeight * MAX_DRAWER_HEIGHT_RATIO), candidate));
      setDrawerHeight(bounded);
    };

    const onPointerUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [drawerHeight]);

  // ui
  const Header = (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${isDark ? token.colorBorder : '#E8E8E8'}`,
        backgroundColor: isDark ? token.colorBgElevated : '#F8F9FA',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <FileTextOutlined style={{ color: isDark ? token.colorPrimary : '#1A2A80', fontSize: 18, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <Title level={5} style={{ margin: 0, color: isDark ? token.colorPrimary : '#1A2A80' }}>
            Datos del Documento
          </Title>
          {document && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', maxWidth: isMobile ? 200 : 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {document.originalName}
            </Text>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} style={{ color: '#666666', fontSize: 16, padding: 6 }} />
      </div>
    </div>
  );

  const Body = (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: 16, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {isLoading && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>
            <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>
            <Card>
              <Skeleton.Button active style={{ width: 200, height: 40 }} />
              <Skeleton active paragraph={{ rows: 4, style: { marginTop: 16 } }} />
            </Card>
          </Space>
        )}

        {error && (
          <Alert
            message="Error al cargar datos"
            description={<Space direction="vertical" style={{ width: '100%' }}><Text>{error}</Text>{retryCount > 0 && <Text type="secondary">Intentos de recarga: {retryCount}</Text>}</Space>}
            type="error"
            showIcon
            action={<Button size="small" icon={<ReloadOutlined />} onClick={retryLoadData} loading={isLoading}>Reintentar</Button>}
            style={{ marginBottom: 16 }}
          />
        )}

        {extractedData && !isLoading && !error && (
          <>
            <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarStyle={{ padding: 0, marginBottom: 8 }}>
              <TabPane tab="Metadatos" key="metadata">
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card title={<Title level={5}>Información del Archivo</Title>}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}><Text strong>Título: </Text><Text>{extractedData.metadata.title || 'No disponible'}</Text></Col>
                      <Col span={12}><Text strong>Autor: </Text><Text>{extractedData.metadata.author || 'No disponible'}</Text></Col>
                      <Col span={8}><Text strong>Tipo: </Text><Text>{extractedData.metadata.fileType || 'N/A'}</Text></Col>
                      <Col span={8}><Text strong>Tamaño: </Text><Text>{extractedData.metadata.size ? `${(extractedData.metadata.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</Text></Col>
                      <Col span={8}><Text strong>Fecha: </Text><Text>{extractedData.metadata.uploadDate || 'N/A'}</Text></Col>
                    </Row>
                  </Card>

                  <Card title={<Title level={5}>Estadísticas de Procesamiento</Title>}>
                    <Row gutter={16}>
                      <Col span={12}><Statistic title="Total de Chunks" value={extractedData.statistics.chunkCount} /></Col>
                      <Col span={12}><Statistic title="Contenido Total (chars)" value={extractedData.statistics.totalContentLength || 0} formatter={(v) => (v as number).toLocaleString()} /></Col>
                    </Row>

                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8}><Statistic title="Chunk Promedio" value={extractedData.statistics.averageChunkSize || 0} formatter={(v) => (v as number).toLocaleString()} suffix="chars" /></Col>
                      <Col span={8}><Statistic title="Chunk Mínimo" value={extractedData.statistics.minChunkSize || 0} formatter={(v) => (v as number).toLocaleString()} suffix="chars" /></Col>
                      <Col span={8}><Statistic title="Chunk Máximo" value={extractedData.statistics.maxChunkSize || 0} formatter={(v) => (v as number).toLocaleString()} suffix="chars" /></Col>
                    </Row>

                    <div style={{ marginTop: 24 }}>
                      <Title level={5} style={{ fontSize: 14, marginBottom: 8 }}>Distribución de Tamaños</Title>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, minWidth: 60 }}>Mínimo</Text>
                        <Progress percent={extractedData.statistics.minChunkSize && extractedData.statistics.maxChunkSize ? Math.round((extractedData.statistics.minChunkSize / extractedData.statistics.maxChunkSize) * 100) : 0} size="small" strokeColor="#ff4d4f" style={{ flex: 1 }} format={() => `${extractedData.statistics.minChunkSize || 0}`} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, minWidth: 60 }}>Promedio</Text>
                        <Progress percent={extractedData.statistics.averageChunkSize && extractedData.statistics.maxChunkSize ? Math.round((extractedData.statistics.averageChunkSize / extractedData.statistics.maxChunkSize) * 100) : 0} size="small" strokeColor="#1890ff" style={{ flex: 1 }} format={() => `${Math.round(extractedData.statistics.averageChunkSize || 0)}`} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, minWidth: 60 }}>Máximo</Text>
                        <Progress percent={100} size="small" strokeColor="#52c41a" style={{ flex: 1 }} format={() => `${extractedData.statistics.maxChunkSize || 0}`} />
                      </div>
                    </div>
                  </Card>
                </Space>
              </TabPane>

              <TabPane tab={`Chunks (${extractedData.chunks.length})`} key="chunks">
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card size="small">
                    <Row gutter={[8, 12]} align="middle">
                      <Col xs={24} sm={24} md={24} lg={12} xl={10}>
                        <Input placeholder="Buscar contenido..." prefix={<SearchOutlined />} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} allowClear size={isMobile ? "small" : undefined} />
                      </Col>

                      <Col xs={12} sm={8} md={8} lg={6} xl={5}>
                        <Select style={{ width: '100%' }} placeholder="Filtrar tipo" value={chunkTypeFilter} onChange={setChunkTypeFilter} suffixIcon={<FilterOutlined />} size={isMobile ? "small" : undefined} popupMatchSelectWidth={false}>
                          <Select.Option value="all">Todos</Select.Option>
                          {chunkTypes.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
                        </Select>
                      </Col>

                      {/* desktop lg y xl */}
                      {screens.lg && (
                        <Col xs={12} sm={16} md={16} lg={6} xl={9}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <ActionButtons />
                          </div>
                        </Col>
                      )}
                    </Row>

                    {/* small screens */}
                    {!screens.lg && (
                      <Row style={{ marginTop: 12 }}>
                        <Col span={24}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <ActionButtons />
                          </div>
                        </Col>
                      </Row>
                    )}

                    {(searchTerm || chunkTypeFilter !== 'all') && (
                      <Row style={{ marginTop: 12 }}>
                        <Col span={24}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Mostrando {filteredChunks.length} de {extractedData.chunks.length} chunks</Text>
                            {searchTerm && <Tag color="blue" style={{ fontSize: isMobile ? 12 : 14 }}>Búsqueda: "{searchTerm.length > MAX_SEARCH_DISPLAY_LENGTH ? `${searchTerm.substring(0, MAX_SEARCH_DISPLAY_LENGTH)}...` : searchTerm}"</Tag>}
                            {chunkTypeFilter !== 'all' && <Tag color="green" style={{ fontSize: isMobile ? 12 : 14 }}>Tipo: {chunkTypeFilter}</Tag>}
                          </div>
                        </Col>
                      </Row>
                    )}
                  </Card>

                  {filteredChunks.length === 0 ? (
                    <Empty description="No se encontraron chunks con los filtros aplicados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <>
                      {paginatedChunks.map((chunk) => (
                        <Card key={chunk.id} size="small" style={{ backgroundColor: isDark ? token.colorBgElevated : '#fafafa' }} extra={<Tooltip title="Copiar chunk"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(chunk.content, 'Chunk')} /></Tooltip>}>
                          <Space style={{ marginBottom: 8 }} wrap size="small">
                            <Tag color="blue" style={{ fontSize: isMobile ? 12 : 14 }}>{`#${chunk.chunkIndex + 1}`}</Tag>
                            <Tag color="cyan" style={{ fontSize: isMobile ? 12 : 14 }}>{chunk.type}</Tag>
                            <Tag color="purple" style={{ fontSize: isMobile ? 12 : 14 }}>{isMobile ? `${Math.round(chunk.contentLength / 100) / 10}k` : `${chunk.contentLength} chars`}</Tag>
                            {chunk.metadata && Object.keys(chunk.metadata).length > 0 && <Tag color="green" style={{ fontSize: isMobile ? 12 : 14 }}>{isMobile ? 'Meta' : 'Con metadata'}</Tag>}
                            {!isMobile && <Tag color="geekblue" style={{ fontSize: 14 }}>{new Date(chunk.createdAt).toLocaleDateString()}</Tag>}
                          </Space>

                          <div style={{ backgroundColor: isDark ? token.colorBgContainer : 'white', padding: isMobile ? 12 : 16, borderRadius: 4, border: `1px solid ${isDark ? token.colorBorder : '#f0f0f0'}`, maxHeight: isMobile ? 150 : 200, overflowY: 'auto' }}>
                            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: isMobile ? 12 : 13, lineHeight: isMobile ? '1.4' : '1.5', wordBreak: 'break-word' }}>
                              {chunk.content}
                            </Paragraph>
                          </div>
                        </Card>
                      ))}

                      {filteredChunks.length > pageSize && (
                        <Card size="small" style={{ textAlign: 'center' }}>
                          <Pagination current={currentPage} total={filteredChunks.length} pageSize={pageSize} onChange={setCurrentPage} onShowSizeChange={(_, size) => { setPageSize(size); setCurrentPage(1); }} showSizeChanger={!isMobile} showQuickJumper={!isMobile} showTotal={!isMobile ? (total, range) => `${range[0]}-${range[1]} de ${total} chunks` : undefined} pageSizeOptions={['5','10','20','50']} size={isMobile ? "small" : "default"} simple={!screens.sm} />
                        </Card>
                      )}
                    </>
                  )}
                </Space>
              </TabPane>
            </Tabs>
          </>
        )}

        {!extractedData && !isLoading && !error && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#999999', padding: 20, textAlign: 'center' }}>
            <Space direction="vertical">
              <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <Text style={{ fontSize: 16 }}>Selecciona un documento para ver sus datos</Text>
              <Text type="secondary" style={{ fontSize: 14 }}>Usa el botón "Datos" en la tabla de documentos</Text>
            </Space>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: bottom-sheet Drawer
  if (isMobile) {
    return (
      <Drawer
        open={visible}
        onClose={onClose}
        placement="bottom"
        height={drawerHeight}
        bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
        drawerStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '100vh' }}
        maskClosable
        closeIcon={null}
        headerStyle={{ display: 'none' }}
      >
        <div
          onPointerDown={onHandlePointerDown}
          style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 6, touchAction: 'none', cursor: 'ns-resize', userSelect: 'none' }}
        >
          <div style={{ width: 40, height: 6, borderRadius: 4, background: '#d9d9d9' }} />
        </div>

        {Header}
        {Body}
      </Drawer>
    );
  }

  // Desktop / tablet
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '50%',
        height: '100vh',
        backgroundColor: isDark ? token.colorBgContainer : '#FFFFFF',
        boxShadow: isDark ? '-4px 0 20px rgba(91, 110, 240, 0.1)' : '-4px 0 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${isDark ? token.colorBorder : '#E8E8E8'}`,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: 'transform 0.28s ease-in-out, opacity 0.28s ease-in-out, visibility 0.28s ease-in-out',
      }}
    >
      {Header}
      {Body}
    </div>
  );
};
