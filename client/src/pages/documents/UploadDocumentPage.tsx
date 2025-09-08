import React, { useCallback, useState } from "react";
import { Card, message, Row, Col, Grid, theme as antTheme } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import PageTemplate from "../../components/PageTemplate";
import UploadButton from "../../components/shared/UploadButton";
import { DocumentTable } from "../../components/documents/DocumentTable";
import { PdfPreviewSidebar } from "../../components/documents/PdfPreviewSidebar";
import { DocumentDataSidebar } from "../../components/documents/DocumentDataSidebar";
import { useDocuments } from "../../hooks/useDocuments";
import { useUserStore } from "../../store/userStore";
import { useThemeStore } from "../../store/themeStore";
import type { Document } from "../../interfaces/documentInterface";

const { useBreakpoint } = Grid;

const UploadDocumentPage: React.FC = () => {
  const { documents, loading, downloadDocument, deleteDocument, loadDocuments, processDocumentComplete } = useDocuments();
  const user = useUserStore((s) => s.user);
  const isStudent = Boolean(user?.roles?.includes?.("estudiante"));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const screens = useBreakpoint();
  
  // Theme
  const theme = useThemeStore((state: { theme: string }) => state.theme);
  const isDark = theme === "dark";
  const { token } = antTheme.useToken();
  
  // Estados para el sidebar de previsualización
  const [previewSidebarVisible, setPreviewSidebarVisible] = useState<boolean>(false);
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null);
  
  // Estados para el sidebar de datos
  const [dataSidebarVisible, setDataSidebarVisible] = useState<boolean>(false);
  const [documentToViewData, setDocumentToViewData] = useState<Document | null>(null);

  const isSmallScreen = !screens.lg;
  const isMobileScreen = !screens.md;
  const sidebarWidth = isSmallScreen ? '100%' : '50%';
  
  const contentMaxWidth = (previewSidebarVisible || dataSidebarVisible) && !isSmallScreen 
    ? '50%'
    : '100%';

  const pageTitle = isSmallScreen ? "Documentos" : "Documentos Académicos";
  const containerPadding = isSmallScreen ? "16px" : "24px";

  const fileConfig = {
    accept: ".pdf",
    maxSize: 10 * 1024 * 1024, // 10MB
    validationMessage: "Solo se permiten archivos PDF de hasta 10MB"
  };

  const processingConfig = {
    steps: [
      { key: "validate", title: "Validación", description: "Validando formato PDF..." },
      { key: "extract", title: "Extracción", description: "Extrayendo contenido..." },
      { key: "process", title: "Procesamiento", description: "Procesando documento..." },
      { key: "store", title: "Almacenamiento", description: "Almacenando información..." }
    ],
    processingText: "Procesando documento PDF...",
    successText: "¡Documento procesado exitosamente!"
  };
    
  const handleUploadSuccess = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDocuments();
    } catch (error) {
      console.error("Error actualizando tabla:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadDocuments]);

  const handleUploadDocument = useCallback(async (file: File, onProgress?: (step: string, progress: number, message: string) => void) => {
    try {
      const result = await processDocumentComplete(file, onProgress);
      return result;
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }, [processDocumentComplete]);

  const handleDownload = useCallback(async (doc: Document) => {
    try {
      await downloadDocument(doc);
      message.success("Archivo descargado correctamente");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al descargar";
      message.error(errorMessage);
    }
  }, [downloadDocument]);

  const handleDeleteSuccess = useCallback(() => {
    message.success("Documento eliminado exitosamente");
    loadDocuments();
  }, [loadDocuments]);

  const handleDeleteError = useCallback((error: Error) => {
    message.error(error.message);
  }, []);

  const handleViewData = useCallback((doc: Document) => {
    if (previewSidebarVisible) {
      setPreviewSidebarVisible(false);
      setDocumentToPreview(null);
    }
    setDocumentToViewData(doc);
    setDataSidebarVisible(true);
  }, [previewSidebarVisible]);

  const handleCloseDataSidebar = useCallback(() => {
    setDataSidebarVisible(false);
    setDocumentToViewData(null);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setPreviewSidebarVisible(false);
    setDocumentToPreview(null);
  }, []);

  // Preview
  const handlePreview = useCallback(async (doc: Document) => {
    if (dataSidebarVisible) {
      setDataSidebarVisible(false);
      setDocumentToViewData(null);
    }
    setDocumentToPreview(doc);
    setPreviewSidebarVisible(true);
  }, [dataSidebarVisible]);

  return (
    <div style={{ 
      position: "relative", 
      width: "100%", 
      height: "100vh", 
      display: "flex",
      overflow: "hidden" 
    }}>
      <div style={{ 
        width: contentMaxWidth,
        transition: "width 0.3s ease-in-out",
        minWidth: 0,
        overflow: "auto",
        height: "100%",
        flex: "0 0 auto" 
      }}>
      <PageTemplate
        title={pageTitle}
        subtitle="Sistema de carga y administración de material educativo en formato PDF"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Documentos" }]}>
        <div style={{
          padding: containerPadding,
          width: "100%",
          margin: "0",
          maxWidth: "none" 
        }}>
          {/* Documents Table Section */}
          <Row>
            <Col xs={24}>
              <Card
                title={
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: isDark ? token.colorText : "#1A2A80",
                    width: "100%",
                    minWidth: 0,
                    gap: isSmallScreen ? "12px" : "16px",
                    flexWrap: isSmallScreen ? "nowrap" : "nowrap"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      minWidth: 0,
                      flex: "1 1 auto",
                      overflow: "hidden"
                    }}>
                      <FileTextOutlined style={{ 
                        marginRight: "8px", 
                        fontSize: isSmallScreen ? "14px" : "20px",
                        flexShrink: 0 
                      }} />
                      <span style={{ 
                        fontSize: isSmallScreen ? "14px" : "18px", 
                        fontWeight: "500",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {isSmallScreen ? "Repositorio" : "Repositorio de Documentos"}
                      </span>
                      <div style={{
                        marginLeft: "12px",
                        backgroundColor: documents.length > 0 
                          ? (isDark ? token.colorPrimaryBg : "#E8F4FD") 
                          : (isDark ? token.colorBgTextHover : "#F0F0F0"),
                        color: documents.length > 0 
                          ? (isDark ? token.colorPrimary : "#3B38A0") 
                          : (isDark ? token.colorTextSecondary : "#666"),
                        padding: isSmallScreen ? "2px 8px" : "4px 10px",
                        borderRadius: isSmallScreen ? "10px" : "16px",
                        fontSize: isSmallScreen ? "10px" : "12px",
                        fontWeight: "500",
                        transition: "all 0.3s ease",
                        flexShrink: 0,
                        whiteSpace: "nowrap"
                      }}>
                        {loading || refreshing ? (isSmallScreen ? "..." : "Actualizando...") : (isSmallScreen ? `${documents.length}` : `${documents.length} documento${documents.length !== 1 ? 's' : ''}`)}
                      </div>
                    </div>

                    {!isStudent && (
                      <div style={{ 
                        flexShrink: 0,
                        minWidth: "fit-content",
                        paddingTop: isSmallScreen ? '6px' : '4px'
                      }}>
                        <UploadButton
                          fileConfig={fileConfig}
                          processingConfig={processingConfig}
                          buttonConfig={{
                            showText: !isMobileScreen,
                            variant: "fill",
                            size: isMobileScreen ? "small" : "middle",
                            shape: "default"
                          }}
                          modalConfig={{
                            title: "Cargar Nuevo Documento",
                            width: isMobileScreen ? (typeof window !== 'undefined' ? window.innerWidth * 0.9 : 600) : 600
                          }}
                          onUpload={handleUploadDocument}
                          onUploadSuccess={handleUploadSuccess}
                        />
                      </div>
                    )}
                  </div>
                }
                style={{
                  borderRadius: "12px",
                  boxShadow: isDark 
                    ? "0 4px 16px rgba(91, 110, 240, 0.1)" 
                    : "0 4px 16px rgba(26, 42, 128, 0.1)",
                  border: `1px solid ${isDark ? token.colorBorder : "#e8eaed"}`,
                  backgroundColor: isDark ? token.colorBgContainer : "#FFFFFF",
                  width: "100%",
                  minWidth: 0,
                  overflow: "hidden"
                }}
              >
                <DocumentTable
                  key={`documents-table-${documents.length}`}
                  documents={documents}
                  loading={loading || refreshing}
                  onDownload={handleDownload}
                  onDelete={deleteDocument}
                  onPreview={handlePreview}
                  onViewData={handleViewData}
                  onDeleteSuccess={handleDeleteSuccess}
                  onDeleteError={handleDeleteError}
                  isStudent={isStudent}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </PageTemplate>
      </div>

      {/* Sidebar de previsualización de PDF */}
      <PdfPreviewSidebar
        document={documentToPreview}
        visible={previewSidebarVisible}
        onClose={handleCloseSidebar}
        sidebarWidth={sidebarWidth}
      />

      {/* Sidebar de datos del documento */}
      <DocumentDataSidebar
        document={documentToViewData}
        visible={dataSidebarVisible}
        onClose={handleCloseDataSidebar}
      />
    </div>
  );
};

export default UploadDocumentPage;
