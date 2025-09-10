import React, { useState, useCallback } from 'react';
import { Button, Modal, Upload, Progress, Typography, Steps, Alert, message, Grid, theme as antTheme } from 'antd';
import { 
  CloudUploadOutlined, 
  PlusOutlined, 
  FileAddOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useThemeStore } from '../../store/themeStore';
import type { RcFile } from 'rc-upload/lib/interface';
import type { ButtonProps } from 'antd';

const { Dragger } = Upload;
const { Text, Title } = Typography;
const { Step } = Steps;
const { useBreakpoint } = Grid;

/**
 * Configuración de un paso del procesamiento
 */
interface ProcessingStep {
  /** Clave única del paso */
  key: string;
  /** Título del paso */
  title: string;
  /** Descripción del paso */
  description: string;
}

/**
 * Configuración de archivos aceptados
 */
interface FileConfig {
  /** Tipos de archivo aceptados (ej: ".pdf", ".docx", ".jpg") */
  accept: string;
  /** Tamaño máximo en bytes */
  maxSize: number;
  /** Mensaje de validación personalizado */
  validationMessage?: string;
}

/**
 * Configuración del procesamiento
 */
interface ProcessingConfig {
  /** Lista de pasos del procesamiento */
  steps: ProcessingStep[];
  /** Texto que aparece durante el procesamiento */
  processingText?: string;
  /** Texto de éxito al completar */
  successText?: string;
}

/**
 * Configuración del botón de subida
 */
interface ButtonConfig {
  /** Mostrar texto "Subir Archivo" junto al ícono */
  showText?: boolean;
  /** Ancho del botón en píxeles */
  width?: number;
  /** Alto del botón en píxeles */
  height?: number;
  /** Estilo del botón */
  variant?: 'fill' | 'ghost' | 'text' | 'link';
  /** Tamaño del botón */
  size?: 'small' | 'middle' | 'large';
  /** Forma del botón */
  shape?: 'default' | 'circle' | 'round';
  /** Si el botón está deshabilitado */
  disabled?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Configuración del modal
 */
interface ModalConfig {
  /** Título del modal */
  title?: string;
  /** Ancho del modal */
  width?: number;
}

/**
 * Estado interno de cada paso de procesamiento
 */
interface ProcessingStepState extends ProcessingStep {
  status: 'wait' | 'process' | 'finish' | 'error';
}

/**
 * Resultado de la subida de archivo
 */
interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  [key: string]: unknown;
}

/**
 * Props del componente UploadButton
 */
interface UploadButtonProps {
  /** Función que se ejecuta para procesar el archivo */
  onUpload: (
    file: File, 
    onProgress?: (step: string, progress: number, message: string) => void
  ) => Promise<unknown>;
  /** Configuración de archivos aceptados */
  fileConfig: FileConfig;
  /** Configuración del procesamiento */
  processingConfig: ProcessingConfig;
  /** Configuración del botón */
  buttonConfig?: ButtonConfig;
  /** Configuración del modal */
  modalConfig?: ModalConfig;
  /** Callback que se ejecuta antes de mostrar el modal */
  onUploadStart?: (file: File) => void;
  /** Callback que se ejecuta después de procesar exitosamente */
  onUploadSuccess?: (result: unknown) => void;
  /** Callback que se ejecuta si hay error en el procesamiento */
  onUploadError?: (error: Error) => void;
  /** Callback que se ejecuta cuando se cierra el modal */
  onModalClose?: () => void;
  /** Si el botón está deshabilitado externamente */
  disabled?: boolean;
}

/**
 * UploadButton - Componente reutilizable para subida de archivos con procesamiento
 * 
 * Este componente encapsula un botón de subida junto con un modal de carga y procesamiento.
 * Maneja internamente todos los estados necesarios (loading, progreso, pasos, etc.)
 * y proporciona callbacks para diferentes eventos del flujo de subida.
 * 
 * Características:
 * - Color fijo: #1A2A80
 * - Ícono fijo: CloudUploadOutlined
 * - Modal con zona de arrastre y pasos de procesamiento configurables
 * - Manejo automático de validación, estados y errores
 * 
 * @example
 * ```tsx
 * // Subida de documentos PDF
 * <UploadButton
 *   onUpload={processDocument}
 *   fileConfig={{
 *     accept: ".pdf,application/pdf",
 *     maxSize: 100 * 1024 * 1024,
 *     validationMessage: "Solo archivos PDF de máximo 100MB"
 *   }}
 *   processingConfig={{
 *     steps: [
 *       { key: 'upload', title: 'Subir Archivo', description: 'Subiendo al servidor' },
 *       { key: 'text', title: 'Extraer Texto', description: 'Extrayendo contenido' },
 *       { key: 'embeddings', title: 'Generar Embeddings', description: 'Procesando IA' }
 *     ],
 *     processingText: "Procesando documento...",
 *     successText: "¡Documento procesado exitosamente!"
 *   }}
 *   onUploadSuccess={() => message.success("Subido correctamente")}
 * />
 * 
 * // Subida de imágenes
 * <UploadButton
 *   onUpload={processImage}
 *   fileConfig={{
 *     accept: ".jpg,.png,.gif",
 *     maxSize: 5 * 1024 * 1024
 *   }}
 *   processingConfig={{
 *     steps: [
 *       { key: 'upload', title: 'Subir Imagen', description: 'Cargando imagen' },
 *       { key: 'resize', title: 'Optimizar', description: 'Redimensionando' }
 *     ],
 *     successText: "¡Imagen cargada!"
 *   }}
 *   buttonConfig={{ showText: false, shape: "circle" }}
 * />
 * ```
 */
const UploadButton: React.FC<UploadButtonProps> = ({
  onUpload,
  fileConfig,
  processingConfig,
  buttonConfig = {},
  modalConfig = {},
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onModalClose,
  disabled = false
}) => {
  // Estados internos
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStepState[]>([]);
  
  // Hooks de tema y responsividad
  const screens = useBreakpoint();
  const isSmallScreen = !screens.lg;
  const { token } = antTheme.useToken();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Configuración por defecto del botón
  const {
    showText = true,
    width,
    height,
    variant = 'fill',
    size = 'large',
    shape = 'default',
    disabled: buttonDisabled = false,
    className = ''
  } = buttonConfig;

  // Configuración por defecto del modal
  const {
    title = 'Cargar Nuevo Archivo',
    width: modalWidth = 600
  } = modalConfig;

  // Configuración por defecto del procesamiento
  const {
    processingText = 'Procesando archivo...',
    successText = '¡Archivo procesado exitosamente!'
  } = processingConfig;

  // Color del componente
  const FIXED_COLOR = token.colorBgElevated === '#141d47' ? '#5b6ef0' : '#1A2A80';

  // Inicializar pasos de procesamiento
  React.useEffect(() => {
    setProcessingSteps(
      processingConfig.steps.map(step => ({
        ...step,
        status: 'wait' as const
      }))
    );
  }, [processingConfig.steps]);

  // Mapeo de variantes a props de Ant Design
  const getButtonProps = (): ButtonProps => {
    const baseProps: ButtonProps = {
      icon: <CloudUploadOutlined />,
      size,
      shape,
      disabled: disabled || buttonDisabled || uploading,
      className,
      style: {
        width,
        height
      }
    };

    switch (variant) {
      case 'fill':
        return { ...baseProps, type: 'primary' };
      case 'ghost':
        return { ...baseProps, ghost: true };
      case 'text':
        return { ...baseProps, type: 'text' };
      case 'link':
        return { ...baseProps, type: 'link' };
      default:
        return { ...baseProps, type: 'default' };
    }
  };

  // Validar archivo
  const validateFile = (file: File): string | null => {
    // Verificar tipo de archivo
    const acceptedTypes = fileConfig.accept.split(',').map(type => type.trim());
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isValidType) {
      return fileConfig.validationMessage || `Solo se permiten archivos: ${fileConfig.accept}`;
    }

    // Verificar tamaño
    if (file.size > fileConfig.maxSize) {
      const maxSizeMB = (fileConfig.maxSize / 1024 / 1024).toFixed(1);
      return `El archivo es demasiado grande. Máximo permitido: ${maxSizeMB} MB`;
    }

    return null;
  };

  // Manejo del clic en el botón
  const handleButtonClick = useCallback(() => {
    setModalOpen(true);
    resetUploader();
  }, []);

  // Manejo de selección de archivo
  const handleFileSelect = (file: RcFile): boolean => {
    const validationError = validateFile(file);
    if (validationError) {
      message.error(validationError);
      return false;
    }

    setSelectedFile(file);
    setError(null);
    onUploadStart?.(file);
    handleFileUpload(file);
    return false; // Prevenir subida automática
  };

  // Procesamiento del archivo
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);
      setUploadSuccess(false);

      const result = await onUpload(file, (step, progress, message) => {
        setCurrentStep(message);
        setProgress(progress);
        
        // Actualizar el estado de los pasos
        setProcessingSteps(prev => prev.map(s => {
          if (s.key === step) {
            return { ...s, status: progress === 100 ? 'finish' : 'process' };
          } else if (prev.findIndex(ps => ps.key === step) > prev.findIndex(ps => ps.key === s.key)) {
            return { ...s, status: 'wait' };
          } else {
            return { ...s, status: 'finish' };
          }
        }));
      });

      setUploadSuccess(true);
      setUploading(false);
      onUploadSuccess?.(result);

    } catch (error) {
      setUploading(false);
      setProgress(0);
      const errorMessage = error instanceof Error ? error.message : 'Error en el procesamiento';
      setError(errorMessage);
      
      // Marcar el paso actual como error
      setProcessingSteps(prev => prev.map(s => 
        s.status === 'process' ? { ...s, status: 'error' } : s
      ));
      
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  // Selección manual de archivo
  const handleManualSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileConfig.accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const validationError = validateFile(file);
        if (validationError) {
          message.error(validationError);
          return;
        }
        setSelectedFile(file);
        setError(null);
        onUploadStart?.(file);
        handleFileUpload(file);
      }
    };
    input.click();
  };

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    onModalClose?.();
    // Reset después de cerrar para evitar parpadeos
    setTimeout(resetUploader, 300);
  }, [onModalClose]);

  // Resetear uploader
  const resetUploader = () => {
    setSelectedFile(null);
    setProgress(0);
    setUploading(false);
    setUploadSuccess(false);
    setCurrentStep('');
    setError(null);
    setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'wait' as const })));
  };

  // Renderizar pasos de procesamiento
  const renderProcessingSteps = () => {
    if (!uploading && !uploadSuccess) return null;

    return (
      <div style={{ marginTop: '24px' }}>
        <Title 
          level={5} 
          style={{ 
            color: '#1A2A80', 
            marginBottom: '16px',
            fontSize: isSmallScreen ? '14px' : '16px'
          }}
        >
          Progreso del Procesamiento
        </Title>
        <Steps 
          direction={isSmallScreen ? "vertical" : "vertical"}
          size={isSmallScreen ? "small" : "default"}
          current={processingSteps.findIndex(s => s.status === 'process')}
        >
          {processingSteps.map((step) => (
            <Step
              key={step.key}
              title={<span style={{ fontSize: isSmallScreen ? '12px' : '14px' }}>{step.title}</span>}
              description={
                <span style={{ fontSize: isSmallScreen ? '11px' : '12px' }}>
                  {step.description}
                </span>
              }
              status={step.status}
              icon={
                step.status === 'process' ? <LoadingOutlined /> :
                step.status === 'error' ? <ExclamationCircleOutlined /> :
                step.status === 'finish' ? <CheckCircleOutlined /> : undefined
              }
            />
          ))}
        </Steps>
        
        {currentStep && (
          <Alert
            message={currentStep}
            type="info"
            showIcon
            style={{ 
              marginTop: '16px',
              fontSize: isSmallScreen ? '12px' : '14px'
            }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Botón de subida */}
      <Button
        {...getButtonProps()}
        onClick={handleButtonClick}
      >
        {showText && 'Subir Archivo'}
      </Button>

      {/* Modal de subida */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: isDark ? '#ffffff' : FIXED_COLOR,
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {title}
          </div>
        }
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        centered
        width={modalWidth}
        destroyOnClose={false}
        styles={{
          header: {
            backgroundColor: isDark ? token.colorBgContainer : '#f8f9ff',
            borderBottom: `1px solid ${isDark ? token.colorBorder : '#e8eaed'}`
          },
          body: {
            padding: isSmallScreen ? '16px' : '24px'
          }
        }}
      >
        <div style={{ padding: isSmallScreen ? '16px 0' : '24px 0' }}>
          {!uploading && !uploadSuccess ? (
            <>
              {/* Zona de arrastre */}
              <Dragger
                name="file"
                multiple={false}
                accept={fileConfig.accept}
                beforeUpload={handleFileSelect}
                showUploadList={false}
                style={{
                  border: `2px dashed ${isDark ? token.colorBorder : '#7A85C1'}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? token.colorBgElevated : '#F8F9FB',
                  padding: isSmallScreen ? '20px 16px' : '40px 20px',
                  cursor: 'pointer'
                }}
              >
                <p className="ant-upload-drag-icon">
                  <CloudUploadOutlined style={{ 
                    fontSize: isSmallScreen ? '36px' : '48px', 
                    color: isDark ? '#5b6ef0' : '#3B38A0' 
                  }} />
                </p>
                <p className="ant-upload-text" style={{ 
                  color: isDark ? '#ffffff' : '#1A2A80', 
                  fontSize: isSmallScreen ? '14px' : '16px', 
                  fontWeight: '500',
                  margin: isSmallScreen ? '12px 0 6px 0' : '16px 0 8px 0'
                }}>
                  {isSmallScreen ? 'Toca o arrastra aquí' : 'Haz clic o arrastra el archivo aquí'}
                </p>
                <p className="ant-upload-hint" style={{ 
                  color: isDark ? '#bfc7ff' : '#7A85C1',
                  fontSize: isSmallScreen ? '12px' : '14px',
                  margin: '0',
                  padding: isSmallScreen ? '0 8px' : '0'
                }}>
                  {fileConfig.validationMessage || 
                   `Archivos aceptados: ${fileConfig.accept}. Tamaño máximo: ${(fileConfig.maxSize / 1024 / 1024).toFixed(1)}MB`}
                </p>
              </Dragger>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleManualSelect}
                  style={{
                    backgroundColor: isDark ? token.colorPrimary : '#1890ff',
                    borderColor: isDark ? token.colorPrimary : '#1890ff',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                  size={isSmallScreen ? "middle" : "large"}
                >
                  {isSmallScreen ? 'Seleccionar' : 'Seleccionar Archivo'}
                </Button>
              </div>
            </>
          ) : uploadSuccess ? (
            <div style={{ 
              textAlign: 'center', 
              padding: isSmallScreen ? '30px 16px' : '40px 20px',
              backgroundColor: isDark ? token.colorBgElevated : '#f6ffed',
              borderRadius: '8px',
              border: `2px solid ${isDark ? token.colorSuccess : '#52c41a'}`
            }}>
              <CheckCircleOutlined style={{ 
                fontSize: isSmallScreen ? '48px' : '64px', 
                color: isDark ? token.colorSuccess : '#52c41a', 
                marginBottom: isSmallScreen ? '12px' : '16px',
                display: 'block'
              }} />
              
              <Text style={{ 
                color: isDark ? token.colorSuccess : '#389e0d', 
                fontSize: isSmallScreen ? '16px' : '18px', 
                fontWeight: '600',
                display: 'block',
                marginBottom: '8px'
              }}>
                {successText}
              </Text>

              {selectedFile && (
                <Text style={{ 
                  color: isDark ? token.colorTextSecondary : '#666', 
                  fontSize: isSmallScreen ? '12px' : '14px',
                  display: 'block',
                  marginBottom: '16px'
                }}>
                  "{selectedFile.name}" está listo
                </Text>
              )}

              <Button
                type="primary"
                onClick={handleCloseModal}
                style={{
                  backgroundColor: isDark ? token.colorSuccess : '#52c41a',
                  borderColor: isDark ? token.colorSuccess : '#52c41a',
                  marginTop: '16px'
                }}
                size={isSmallScreen ? "middle" : "large"}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: isSmallScreen ? '30px 16px' : '40px 20px',
              backgroundColor: isDark ? token.colorBgElevated : '#F8F9FB',
              borderRadius: '8px',
              border: `2px solid ${isDark ? token.colorBorder : '#7A85C1'}`
            }}>
              <FileAddOutlined style={{ 
                fontSize: isSmallScreen ? '36px' : '48px', 
                color: '#3B38A0', 
                marginBottom: isSmallScreen ? '12px' : '16px' 
              }} />
              
              {selectedFile && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '4px',
                    flexWrap: isSmallScreen ? 'wrap' : 'nowrap'
                  }}>
                    <FileTextOutlined style={{ 
                      color: '#1A2A80', 
                      marginRight: '8px', 
                      fontSize: isSmallScreen ? '14px' : '16px' 
                    }} />
                    <Text strong style={{ 
                      color: '#1A2A80',
                      fontSize: isSmallScreen ? '12px' : '14px',
                      wordBreak: 'break-word',
                      textAlign: 'center'
                    }}>
                      {selectedFile.name}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: isSmallScreen ? '11px' : '12px' }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </div>
              )}

              <Text style={{ 
                color: '#1A2A80', 
                fontSize: isSmallScreen ? '14px' : '16px', 
                fontWeight: '500',
                display: 'block',
                marginBottom: '16px'
              }}>
                {processingText}
              </Text>

              <Progress
                percent={progress}
                strokeColor="#3B38A0"
                trailColor="#E6E6E6"
                style={{ 
                  maxWidth: isSmallScreen ? '250px' : '300px', 
                  margin: '0 auto 24px auto' 
                }}
                size={isSmallScreen ? "small" : "default"}
              />

              {renderProcessingSteps()}

              {error && (
                <Alert
                  message="Error en el procesamiento"
                  description={error}
                  type="error"
                  showIcon
                  style={{ 
                    marginTop: '16px', 
                    textAlign: 'left',
                    fontSize: isSmallScreen ? '12px' : '14px'
                  }}
                  action={
                    <Button 
                      size={isSmallScreen ? "small" : "middle"} 
                      onClick={resetUploader}
                    >
                      Reintentar
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default UploadButton;

// Exportar tipos para uso externo
export type { 
  UploadButtonProps, 
  FileConfig, 
  ProcessingConfig, 
  ProcessingStep, 
  ButtonConfig, 
  ModalConfig,
  UploadResult 
};