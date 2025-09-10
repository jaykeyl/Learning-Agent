import axios from 'axios';
import type { CancelTokenSource } from 'axios';
import { meAPI } from './authService';

export interface ChunkedUploadProgress {
  stepKey: string;
  progress: number;
  message: string;
  uploadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  timeRemaining?: number;
}

export interface ChunkedUploadOptions {
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

export interface ChunkedUploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  completed: boolean;
  fileSize: number;
}

export interface ChunkedUploadResult {
  success: boolean;
  document?: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
    uploadedAt: string;
  };
  sessionId: string;
  error?: string;
  status?: 'uploaded' | 'restored' | 'duplicate_found' | 'similar_found';
}

class ChunkedUploadService {
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private uploadSessions: Map<string, ChunkedUploadSession> = new Map();
  private API_URL: string;

  constructor() {
    this.API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/";
  }

  private async getAuthToken(): Promise<string> {
    const authData = localStorage.getItem("auth");
    if (!authData) {
      throw new Error('No hay datos de autenticación disponibles. Por favor, inicia sesión.');
    }

    try {
      const parsedAuth = JSON.parse(authData);
      const token = parsedAuth.accessToken;

      if (!token) {
        throw new Error('Token de acceso no encontrado. Por favor, inicia sesión nuevamente.');
      }

      await meAPI(token);
      return token;
    } catch {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
  }

  async initializeUploadSession(
    file: File, 
    options: ChunkedUploadOptions = {}
  ): Promise<{ sessionId: string; session: ChunkedUploadSession }> {
    const { chunkSize = 1024 * 1024 } = options;
    
    try {
      const token = await this.getAuthToken();
      const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      const session: ChunkedUploadSession = {
        sessionId,
        fileName: file.name,
        totalChunks,
        chunkSize,
        uploadedChunks: [],
        completed: false,
        fileSize: file.size
      };

      this.uploadSessions.set(sessionId, session);

      const cancelTokenSource = axios.CancelToken.source();
      this.cancelTokens.set(sessionId, cancelTokenSource);

      await axios.post(
        `${this.API_URL}api/documents/upload/init`,
        {
          sessionId,
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          chunkSize,
          mimeType: file.type
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cancelToken: cancelTokenSource.token
        }
      );

      return { sessionId, session };
    } catch (error) {
      console.error('Error initializing upload session:', error);
      throw new Error('Error al inicializar la sesión de subida');
    }
  }

  async uploadFileWithChunks(
    file: File,
    options: ChunkedUploadOptions = {}
  ): Promise<ChunkedUploadResult> {
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!file) {
        throw new Error('No se ha seleccionado ningún archivo');
      }

      if (file.size === 0) {
        throw new Error('El archivo está vacío');
      }

      const { chunkSize = 1024 * 1024 } = options;
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        const uploadedBytes = Math.min((i + 1) * chunkSize, file.size);
        
        options.onProgress?.({
          stepKey: 'upload',
          progress,
          message: `Subiendo chunk ${i + 1} de ${totalChunks}`,
          uploadedBytes,
          totalBytes: file.size,
        });
        
        options.onChunkComplete?.(i, totalChunks);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const { documentService } = await import('./documents.service');
      const result = await documentService.uploadDocument(file);

      if (!result.success) {
        throw new Error('Error en la subida del documento');
      }

      options.onProgress?.({
        stepKey: 'complete',
        progress: 100,
        message: 'Subida completada exitosamente'
      });

      return {
        success: true,
        document: result.data,
        sessionId,
        status: result.status, // Pasar el status del backend
      };

    } catch (error) {
      console.error('Error in chunked upload:', error);
      
      return {
        success: false,
        sessionId,
        error: error instanceof Error ? error.message : 'Error desconocido en la subida'
      };
    }
  }

  async cancelUpload(sessionId: string): Promise<void> {
    try {
      const cancelTokenSource = this.cancelTokens.get(sessionId);
      if (cancelTokenSource) {
        cancelTokenSource.cancel('Upload cancelado por el usuario');
        this.cancelTokens.delete(sessionId);
      }

      try {
        const token = await this.getAuthToken();
        await axios.post(
          `${this.API_URL}api/documents/upload/cancel`,
          { sessionId },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
      } catch (error) {
        console.warn('Error notificando cancelación al backend:', error);
      }

      this.uploadSessions.delete(sessionId);
    } catch (error) {
      console.error('Error canceling upload:', error);
    }
  }

  getUploadSession(sessionId: string): ChunkedUploadSession | null {
    return this.uploadSessions.get(sessionId) || null;
  }

  isUploadInProgress(sessionId: string): boolean {
    const session = this.uploadSessions.get(sessionId);
    return session ? !session.completed : false;
  }

  cleanupCompletedSessions(): void {
    for (const [sessionId, session] of this.uploadSessions.entries()) {
      if (session.completed) {
        this.uploadSessions.delete(sessionId);
        this.cancelTokens.delete(sessionId);
      }
    }
  }

  getUploadStats(sessionId: string): {
    uploadedChunks: number;
    totalChunks: number;
    uploadedBytes: number;
    totalBytes: number;
    progressPercentage: number;
  } | null {
    const session = this.uploadSessions.get(sessionId);
    if (!session) return null;

    const uploadedBytes = session.uploadedChunks.length * session.chunkSize;
    const progressPercentage = (session.uploadedChunks.length / session.totalChunks) * 100;

    return {
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.totalChunks,
      uploadedBytes,
      totalBytes: session.fileSize,
      progressPercentage: Math.round(progressPercentage)
    };
  }
}

export const chunkedUploadService = new ChunkedUploadService();
