import { useCallback } from 'react';
import { chunkedUploadService } from '../services/chunkedUpload.service';
import { documentService } from '../services/documents.service';
import type { 
  ChunkedUploadResult, 
  ChunkedUploadOptions 
} from '../services/chunkedUpload.service';
import type { Document } from '../interfaces/documentInterface';

export const useChunkedDocumentUpload = () => {
  
  const processDocumentComplete = useCallback(async (
    document: ChunkedUploadResult['document'],
    onProgress?: (step: string, progress: number, message: string) => void,
    uploadStatus?: string // Agregar parámetro para el status del upload
  ): Promise<{
    success: boolean;
    document: Document;
    processing: {
      textProcessed: boolean;
      chunksProcessed: boolean;
      totalChunks: number;
    };
  }> => {
    if (!document) {
      throw new Error('Documento no disponible para procesamiento');
    }

    try {
      const documentForProcessing: Document = {
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        downloadUrl: document.downloadUrl,
        uploadedAt: document.uploadedAt,
      };

      // Si el documento fue subido con optimización (status 'uploaded') o restaurado (status 'restored'),
      // es probable que ya esté completamente procesado
      if (uploadStatus === 'uploaded' || uploadStatus === 'restored') {
        // Verificar si ya tiene chunks para determinar si necesita procesamiento
        try {
          const chunksInfo = await documentService.getDocumentChunks(document.id);
          if (chunksInfo.data && chunksInfo.data.total > 0) {
            // El documento ya tiene chunks, no necesita post-procesamiento
            onProgress?.('complete', 100, uploadStatus === 'restored' 
              ? 'Documento restaurado y ya procesado' 
              : 'Documento ya procesado');
            return {
              success: true,
              document: documentForProcessing,
              processing: {
                textProcessed: true,
                chunksProcessed: true,
                totalChunks: chunksInfo.data.total,
              },
            };
          }
        } catch {
          // Si no puede obtener chunks, proceder con procesamiento normal
          console.log('No se pudieron obtener chunks, procediendo con procesamiento...');
        }
      }

      // Procesamiento normal para documentos que necesitan post-procesamiento
      onProgress?.('text', 33, 'Procesando texto del documento...');
      try {
        await documentService.processDocumentText(document.id);
      } catch (textError: unknown) {
        // Si el documento ya está procesado, ignorar el error 400
        if (textError && typeof textError === 'object' && 'response' in textError) {
          const errorResponse = textError as { response?: { status?: number } };
          if (errorResponse.response?.status === 400) {
            console.log('Documento ya procesado, continuando...');
          } else {
            throw textError;
          }
        } else {
          throw textError;
        }
      }

      onProgress?.('chunks', 66, 'Generando chunks del documento...');
      const chunksResult = await documentService.processDocumentChunks(document.id);

      onProgress?.('complete', 100, 'Procesamiento completado');

      return {
        success: true,
        document: documentForProcessing,
        processing: {
          textProcessed: true,
          chunksProcessed: true,
          totalChunks: chunksResult.data?.totalChunks || 0,
        },
      };
    } catch (error) {
      console.error('Error in post-upload processing:', error);
      throw new Error('Error en el procesamiento post-upload del documento');
    }
  }, []);

  const uploadAndProcessDocument = useCallback(async (
    file: File,
    options: ChunkedUploadOptions = {}
  ): Promise<{
    success: boolean;
    document: Document;
    processing: {
      textProcessed: boolean;
      chunksProcessed: boolean;
      totalChunks: number;
    };
  }> => {
    try {
      const uploadResult = await chunkedUploadService.uploadFileWithChunks(file, options);
      
      if (!uploadResult.success || !uploadResult.document) {
        throw new Error(uploadResult.error || 'Error en la subida chunked');
      }

      const processingResult = await processDocumentComplete(
        uploadResult.document, 
        undefined, 
        uploadResult.status
      );
      
      return processingResult;
    } catch (error) {
      console.error('Error in complete chunked upload and processing:', error);
      throw error;
    }
  }, [processDocumentComplete]);

  const cancelUpload = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await chunkedUploadService.cancelUpload(sessionId);
    } catch (error) {
      console.error('Error canceling upload:', error);
      throw error;
    }
  }, []);

  const getUploadStats = useCallback((sessionId: string) => {
    return chunkedUploadService.getUploadStats(sessionId);
  }, []);

  const isUploadInProgress = useCallback((sessionId: string): boolean => {
    return chunkedUploadService.isUploadInProgress(sessionId);
  }, []);

  const cleanupCompletedSessions = useCallback((): void => {
    chunkedUploadService.cleanupCompletedSessions();
  }, []);

  return {
    // Función principal para usar con ChunkedUploadButton
    processDocumentComplete,
    
    // Función completa de upload y procesamiento
    uploadAndProcessDocument,
    
    // Funciones de control
    cancelUpload,
    getUploadStats,
    isUploadInProgress,
    cleanupCompletedSessions,
    
    // Servicio subyacente para acceso directo si es necesario
    chunkedUploadService,
  };
};
