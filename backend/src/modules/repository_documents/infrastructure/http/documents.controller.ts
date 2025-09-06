import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  // Query,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedRequest } from '../http/middleware/auth.middleware';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContextualLoggerService } from '../services/contextual-logger.service';
import { ListDocumentsUseCase } from '../../application/queries/list-documents.usecase';
import { DeleteDocumentUseCase } from '../../application/commands/delete-document.usecase';
import { UploadDocumentUseCase } from '../../application/commands/upload-document.usecase';
import { ProcessDocumentTextUseCase } from '../../application/commands/process-document-text.usecase';
import { ProcessDocumentChunksUseCase } from '../../application/commands/process-document-chunks.usecase';
import {
  DocumentListResponseDto,
  DocumentListItemDto,
} from './dtos/list-documents.dto';
import {
  DeleteDocumentResponseDto,
  DeleteDocumentErrorDto,
} from './dtos/delete-document.dto';
import type { UploadDocumentResponseDto } from '../http/dtos/upload-document.dto';
import { DownloadDocumentUseCase } from '../../application/commands/download-document.usecase';

@Controller('api/documents')
export class DocumentsController {
  constructor(
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly downloadDocumentUseCase: DownloadDocumentUseCase,
    private readonly processDocumentTextUseCase: ProcessDocumentTextUseCase,
    private readonly processDocumentChunksUseCase: ProcessDocumentChunksUseCase,
    private readonly logger: ContextualLoggerService,
  ) {}

  @Get()
  async listDocuments(): Promise<DocumentListResponseDto> {
    try {
      this.logger.logDocumentOperation('list');
      
      const result = await this.listDocumentsUseCase.execute();

      // Mapear la respuesta del dominio a DTOs
      const documents = result.docs.map(
        (doc) =>
          new DocumentListItemDto(
            doc.id,
            doc.fileName,
            doc.originalName,
            doc.mimeType,
            doc.size,
            doc.downloadUrl,
            doc.uploadedAt,
          ),
      );

      this.logger.log('Documents retrieved successfully', {
        totalDocuments: result.total,
        documentsReturned: documents.length,
      });

      return new DocumentListResponseDto(
        documents,
        result.total,
        'Documentos recuperados exitosamente',
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Error retrieving documents', error instanceof Error ? error : errorMessage, {
        errorType: 'DOCUMENTS_LIST_ERROR',
      });

      // Manejar diferentes tipos de errores
      if (errorMessage.includes('Bucket de documentos no encontrado')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Servicio de almacenamiento no disponible',
            error: 'Bucket Configuration Error',
            details: errorMessage,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (errorMessage.includes('Error de conexión con MinIO')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Servicio de almacenamiento temporalmente no disponible',
            error: 'Storage Connection Error',
            details: errorMessage,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Error genérico
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al obtener documentos',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id') documentId: string,
  ): Promise<DeleteDocumentResponseDto> {
    try {
      this.logger.logDocumentOperation('delete', documentId);
      
      const result = await this.deleteDocumentUseCase.execute(documentId);

      if (!result.success) {
        // Documento no encontrado
        if (result.error === 'DOCUMENT_NOT_FOUND') {
          this.logger.warn('Document not found for deletion', {
            documentId,
            errorType: 'DOCUMENT_NOT_FOUND',
          });
          
          throw new HttpException(
            new DeleteDocumentErrorDto(
              'Document Not Found',
              result.message,
              documentId,
            ),
            HttpStatus.NOT_FOUND,
          );
        }

        // Otros errores
        this.logger.error('Document deletion failed', result.message, {
          documentId,
          errorType: result.error,
        });
        
        throw new HttpException(
          new DeleteDocumentErrorDto(
            'Delete Failed',
            result.message,
            documentId,
          ),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log('Document deleted successfully', {
        documentId,
        deletedAt: result.deletedAt,
      });

      return new DeleteDocumentResponseDto(
        result.message,
        documentId,
        result.deletedAt!,
      );
    } catch (error) {
      // Si ya es una HttpException, re-lanzarla
      if (error instanceof HttpException) {
        throw error;
      }

      // Error inesperado
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Unexpected error in deleteDocument', error instanceof Error ? error : errorMessage, {
        documentId,
        errorType: 'UNEXPECTED_ERROR',
      });

      throw new HttpException(
        new DeleteDocumentErrorDto(
          'Internal Server Error',
          `Error interno del servidor al eliminar documento: ${errorMessage}`,
          documentId,
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadDocumentResponseDto> {
    try {
      console.log(' Upload request received:', {
        hasFile: !!file,
        fileInfo: file ? {
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          fieldname: file.fieldname,
        } : null,
        hasUser: !!req.user,
        userId: req.user?.id,
        headers: req.headers,
      });

      if (!file) {
        throw new BadRequestException('No se ha proporcionado ningún archivo');
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException('Usuario no autenticado');
      }

      this.logger.setContext({ userId });
      this.logger.logDocumentOperation('upload', undefined, {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      const document = await this.uploadDocumentUseCase.execute(file, userId);

      this.logger.log('Document uploaded successfully', {
        documentId: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        size: document.size,
      });

      return {
        id: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        downloadUrl: document.url,
        uploadedAt: document.uploadedAt,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      // Error inesperado
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Unexpected error in uploadDocument', error instanceof Error ? error : errorMessage, {
        fileName: file?.originalname,
        fileSize: file?.size,
        errorType: 'UPLOAD_ERROR',
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al subir archivo',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:id')
  async downloadDocument(
    @Param('id') documentId: string,
  ): Promise<{ downloadUrl: string }> {
    try {
      if (!documentId) {
        throw new BadRequestException(
          'No se ha proporcionado el ID del documento',
        );
      }

      this.logger.logDocumentOperation('download', documentId);

      const downloadUrl =
        await this.downloadDocumentUseCase.execute(documentId);
      
      this.logger.log('Document download URL generated successfully', {
        documentId,
        downloadUrlLength: downloadUrl.length,
      });
      
      return { downloadUrl };
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Unexpected error in downloadDocument', error instanceof Error ? error : errorMessage, {
        documentId,
        errorType: 'DOWNLOAD_ERROR',
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al generar URL de descarga',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/process-text')
  async processDocumentText(
    @Param('documentId') documentId: string,
  ): Promise<{ message: string; success: boolean }> {
    try {
      this.logger.logDocumentOperation('process', documentId, {
        operation: 'text_extraction',
      });

      const success = await this.processDocumentTextUseCase.execute(documentId);

      if (success) {
        this.logger.log('Document text processed successfully', {
          documentId,
          operation: 'text_extraction',
        });
        
        return {
          success: true,
          message: 'Texto extraído exitosamente del documento',
        };
      } else {
        this.logger.warn('Document text processing failed', {
          documentId,
          operation: 'text_extraction',
        });
        
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'No se pudo procesar el documento',
            error: 'Processing Failed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Unexpected error in processDocumentText', error instanceof Error ? error : errorMessage, {
        documentId,
        operation: 'text_extraction',
        errorType: 'PROCESSING_ERROR',
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al procesar documento',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Procesa chunks de un documento específico
   */
  @Post(':documentId/process-chunks')
  async processDocumentChunks(
    @Param('documentId') documentId: string,
    @Body()
    body: {
      chunkingConfig?: {
        maxChunkSize?: number;
        overlap?: number;
        respectParagraphs?: boolean;
        respectSentences?: boolean;
        minChunkSize?: number;
      };
      replaceExisting?: boolean;
      chunkType?: string;
    } = {},
  ) {
    try {
      if (!documentId) {
        throw new BadRequestException('ID de documento requerido');
      }

      this.logger.logChunkOperation('process', documentId, undefined, {
        chunkingConfig: body.chunkingConfig,
        replaceExisting: body.replaceExisting,
        chunkType: body.chunkType,
      });

      const result = await this.processDocumentChunksUseCase.execute({
        documentId,
        chunkingConfig: body.chunkingConfig,
        replaceExisting: body.replaceExisting,
        chunkType: body.chunkType,
      });

      if (result.status === 'success') {
        this.logger.logChunkOperation('process', documentId, result.savedChunks.length, {
          processingTimeMs: result.processingTimeMs,
          statistics: result.chunkingResult.statistics,
        });
        
        return {
          success: true,
          message: 'Chunks procesados exitosamente',
          data: {
            totalChunks: result.savedChunks.length,
            processingTimeMs: result.processingTimeMs,
            statistics: result.chunkingResult.statistics,
          },
        };
      } else {
        this.logger.error('Chunk processing failed', JSON.stringify(result.errors), {
          documentId,
          operation: 'chunk_processing',
          errors: result.errors,
        });
        
        return {
          success: false,
          message: 'Error procesando chunks',
          errors: result.errors,
        };
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Unexpected error in processDocumentChunks', error instanceof Error ? error : errorMessage, {
        documentId,
        operation: 'chunk_processing',
        errorType: 'CHUNK_PROCESSING_ERROR',
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al procesar chunks',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los chunks de un documento
   */
  @Get(':documentId/chunks')
  async getDocumentChunks(
    @Param('documentId') documentId: string,
    // @Query('limit') limit?: number,
    // @Query('offset') offset?: number,
  ) {
    try {
      if (!documentId) {
        throw new BadRequestException('ID de documento requerido');
      }

      this.logger.logChunkOperation('retrieve', documentId);

      // Usar el servicio de chunking para obtener chunks con estadísticas
      const result =
        await this.processDocumentChunksUseCase[
          'chunkingService'
        ].getDocumentChunks(documentId);

      this.logger.log('Document chunks retrieved successfully', {
        documentId,
        totalChunks: result.total,
        chunksReturned: result.chunks.length,
        statistics: result.statistics,
      });

      return {
        success: true,
        message: 'Chunks recuperados exitosamente',
        data: {
          chunks: result.chunks.map((chunk) => ({
            id: chunk.id,
            content:
              chunk.content.substring(0, 200) +
              (chunk.content.length > 200 ? '...' : ''), // Preview
            chunkIndex: chunk.chunkIndex,
            type: chunk.type, // Usar 'type' no 'chunkType'
            contentLength: chunk.content.length,
            metadata: chunk.metadata,
            createdAt: chunk.createdAt,
          })),
          total: result.total,
          statistics: result.statistics,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Unexpected error in getDocumentChunks', error instanceof Error ? error : errorMessage, {
        documentId,
        operation: 'chunk_retrieval',
        errorType: 'CHUNK_RETRIEVAL_ERROR',
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al obtener chunks',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
