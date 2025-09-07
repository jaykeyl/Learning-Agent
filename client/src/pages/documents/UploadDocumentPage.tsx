import React, { useCallback, useState } from "react";
import { Card, message, Row, Col, Grid, theme as antTheme } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import PageTemplate from "../../components/PageTemplate";
import UploadButton from "../../components/shared/UploadButton";
import { DocumentTable } from "../../components/documents/DocumentTable";
import { PdfPreviewSidebar } from "../../components/documents/PdfPreviewSidebar";
import { DocumentDataSidebar } from "../../components/documents/DocumentDataSidebar";
import { useDocuments } from "../../hooks/useDocuments";
import { useThemeStore } from "../../store/themeStore";
import { documentService } from "../../services/documents.service";
import type { Document } from "../../interfaces/documentInterface";

const { useBreakpoint } = Grid;

const UploadDocumentPage: React.FC = () => {
  const { documents, loading, downloadDocument, deleteDocument, loadDocuments, processDocumentComplete } = useDocuments();
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

  // mobile view: abrir PDF en nueva pestaña (a pesar de que ya no hay preview en mobile, se deja esta función para abrir en nueva pestaña)
  const handlePreview = useCallback(async (doc: Document) => {
    if (isMobileScreen) {
      try {
        const url = await documentService.getDownloadUrl(doc.id);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Error al abrir PDF en nueva pestaña:', err);
        message.error('No se pudo abrir el PDF. Intenta descargarlo.');
      }
      return;
    }

    // Desktop / tablet
    if (dataSidebarVisible) {
      setDataSidebarVisible(false);
      setDocumentToViewData(null);
    }
    setDocumentToPreview(doc);
    setPreviewSidebarVisible(true);
  }, [dataSidebarVisible, isMobileScreen]);

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
        title={isSmallScreen ? "Documentos" : "Documentos Académicos"}
        subtitle="Sistema de carga y administración de material educativo en formato PDF"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Documentos" }]}>
        <div style={{
          padding: isSmallScreen ? "16px" : "24px",
          width: "100%",
          margin: "0",
          maxWidth: "none" 
        }}>
          {/* Documents Table Section */}
          <Row>
            <Col xs={24}>
              <Card
                title={
                  isSmallScreen ? (
                    // Mobile view 
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: (previewSidebarVisible || dataSidebarVisible) ? "16px" : "12px",
                      color: isDark ? token.colorText : "#1A2A80",
                      flexWrap: "nowrap",
                      width: "100%",
                      minWidth: 0
                    }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center",
                        gap: "6px",
                        minWidth: 0,
                        flex: "1 1 auto",
                        marginRight: (previewSidebarVisible || dataSidebarVisible) ? "16px" : "12px"
                      }}>
                        <FileTextOutlined style={{ 
                          fontSize: "14px",
                          flexShrink: 0
                        }} />
                        <span style={{ 
                          fontSize: "14px", 
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          Repositorio
                        </span>
                        
                        {/* Contador */}
                        <div style={{
                          backgroundColor: documents.length > 0 
                            ? (isDark ? token.colorPrimaryBg : "#E8F4FD") 
                            : (isDark ? token.colorBgTextHover : "#F0F0F0"),
                          color: documents.length > 0 
                            ? (isDark ? token.colorPrimary : "#3B38A0") 
                            : (isDark ? token.colorTextSecondary : "#666"),
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "10px",
                          fontWeight: "500",
                          transition: "all 0.3s ease",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                          marginLeft: "8px"
                        }}>
                          {loading || refreshing ? "..." : `${documents.length}`}
                        </div>
                      </div>
                      
                      {/* Botón de upload */}
                      <div style={{ 
                        flexShrink: 0,
                        minWidth: "fit-content",
                        paddingTop: isMobileScreen ? '6px' : '4px'
                      }}>
                        <UploadButton
                          fileConfig={{
                            accept: ".pdf",
                            maxSize: 10 * 1024 * 1024, // 10MB
                            validationMessage: "Solo se permiten archivos PDF de hasta 10MB"
                          }}
                          processingConfig={{
                            steps: [
                              { key: "validate", title: "Validación", description: "Validando formato PDF..." },
                              { key: "extract", title: "Extracción", description: "Extrayendo contenido..." },
                              { key: "process", title: "Procesamiento", description: "Procesando documento..." },
                              { key: "store", title: "Almacenamiento", description: "Almacenando información..." }
                            ],
                            processingText: "Procesando documento PDF...",
                            successText: "¡Documento procesado exitosamente!"
                          }}
                          buttonConfig={{
                            showText: !isMobileScreen,
                            variant: "fill",
                            size: isMobileScreen ? "small" : "middle",
                            shape: "default"
                          }}
                          modalConfig={{
                            title: "Cargar Nuevo Documento",
                            width: isMobileScreen ? window.innerWidth * 0.9 : 600
                          }}
                          onUpload={async (file, onProgress) => {
                            try {
                              const result = await processDocumentComplete(file, onProgress);
                              return result;
                            } catch (error) {
                              console.error("Error processing document:", error);
                              throw error;
                            }
                          }}
                          onUploadSuccess={() => {
                            handleUploadSuccess();
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: isDark ? token.colorText : "#1A2A80",
                      width: "100%",
                      minWidth: 0,
                      gap: screens.md && !screens.lg ? "8px" : "16px", // menos espacio en medianas
                      flexWrap: screens.md && !screens.lg ? "wrap" : "nowrap" // si hay poco espacio, permite wrap
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
                          fontSize: "20px",
                          flexShrink: 0 
                        }} />
                        <span style={{ 
                          fontSize: "18px", 
                          fontWeight: "500",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          Repositorio de Documentos
                        </span>
                        <div style={{
                          marginLeft: "12px",
                          backgroundColor: documents.length > 0 
                            ? (isDark ? token.colorPrimaryBg : "#E8F4FD") 
                            : (isDark ? token.colorBgTextHover : "#F0F0F0"),
                          color: documents.length > 0 
                            ? (isDark ? token.colorPrimary : "#3B38A0") 
                            : (isDark ? token.colorTextSecondary : "#666"),
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: "500",
                          transition: "all 0.3s ease",
                          flexShrink: 0,
                          whiteSpace: "nowrap"
                        }}>
                          {loading || refreshing ? "Actualizando..." : `${documents.length} documento${documents.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>

                      <div style={{ 
                        flexShrink: 0,
                        minWidth: screens.md && !screens.lg ? "140px" : "180px", // ancho mínimo reducido en medianas
                        display: "flex",
                        justifyContent: "flex-end",
                        paddingRight: screens.lg ? "6px" : "0", // casi al borde en grandes, cero en medianas
                        paddingTop: screens.md && !screens.lg ? "6px" : "4px" // padding top agregado
                      }}>
                        <UploadButton
                          fileConfig={{
                            accept: ".pdf",
                            maxSize: 10 * 1024 * 1024, // 10MB
                            validationMessage: "Solo se permiten archivos PDF de hasta 10MB"
                          }}
                          processingConfig={{
                            steps: [
                              { key: "validate", title: "Validación", description: "Validando formato PDF..." },
                              { key: "extract", title: "Extracción", description: "Extrayendo contenido..." },
                              { key: "process", title: "Procesamiento", description: "Procesando documento..." },
                              { key: "store", title: "Almacenamiento", description: "Almacenando información..." }
                            ],
                            processingText: "Procesando documento PDF...",
                            successText: "¡Documento procesado exitosamente!"
                          }}
                          buttonConfig={{
                            showText: true,
                            variant: "fill",
                            size: "middle",
                            shape: "default"
                          }}
                          modalConfig={{
                            title: "Cargar Nuevo Documento",
                            width: 600
                          }}
                          onUpload={async (file, onProgress) => {
                            try {
                              const result = await processDocumentComplete(file, onProgress);
                              return result;
                            } catch (error) {
                              console.error("Error processing document:", error);
                              throw error;
                            }
                          }}
                          onUploadSuccess={handleUploadSuccess}
                        />
                      </div>
                    </div>
                  )
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
        isSmallScreen={isSmallScreen}
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
