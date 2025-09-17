import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../http/middleware/auth.middleware';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ContextualLoggerService } from '../services/contextual-logger.service';
import { ListDocumentsUseCase } from '../../application/queries/list-documents.usecase';
import { DeleteDocumentUseCase } from '../../application/commands/delete-document.usecase';
import { UploadDocumentUseCase } from '../../application/commands/upload-document.usecase';
import { ProcessDocumentTextUseCase } from '../../application/commands/process-document-text.usecase';
import { ProcessDocumentChunksUseCase } from '../../application/commands/process-document-chunks.usecase';
import { CheckDocumentSimilarityUseCase } from '../../application/use-cases/check-document-similarity.usecase';
import { CheckDeletedDocumentUseCase } from '../../application/use-cases/check-deleted-document.usecase';
import { DownloadDocumentUseCase } from '../../application/commands/download-document.usecase';
import {
  DocumentListResponseDto,
  DocumentListItemDto,
} from './dtos/list-documents.dto';
import {
  DeleteDocumentResponseDto,
  DeleteDocumentErrorDto,
} from './dtos/delete-document.dto';
import { CheckDocumentSimilarityRequest } from '../../domain/value-objects/document-similarity-check.vo';
import { CheckDeletedDocumentRequest } from '../../domain/value-objects/deleted-document-check.vo';
import {
  UnifiedUploadResponseDto,
  UnifiedUploadRequestDto,
} from './dtos/unified-upload.dto';

@Controller('api/documents')
export class DocumentsController {
  constructor(
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly deleteDocumentUseCase: DeleteDocumentUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly downloadDocumentUseCase: DownloadDocumentUseCase,
    private readonly processDocumentTextUseCase: ProcessDocumentTextUseCase,
    private readonly processDocumentChunksUseCase: ProcessDocumentChunksUseCase,
    private readonly checkDocumentSimilarityUseCase: CheckDocumentSimilarityUseCase,
    private readonly checkDeletedDocumentUseCase: CheckDeletedDocumentUseCase,
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

      this.logger.error(
        'Error retrieving documents',
        error instanceof Error ? error : errorMessage,
        {
          errorType: 'DOCUMENTS_LIST_ERROR',
        },
      );

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

      this.logger.error(
        'Unexpected error in deleteDocument',
        error instanceof Error ? error : errorMessage,
        {
          documentId,
          errorType: 'UNEXPECTED_ERROR',
        },
      );

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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB en bytes
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          callback(
            new BadRequestException('Solo se permiten archivos PDF'),
            false,
          );
        } else {
          callback(null, true);
        }
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: UnifiedUploadRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UnifiedUploadResponseDto> {
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

      this.logger.setContext({ userId });
      this.logger.logDocumentOperation('upload', undefined, {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        options: options,
      });

      // Convertir strings a booleans si vienen de form-data
      const skipSimilarityCheck =
        options.skipSimilarityCheck === true ||
        options.skipSimilarityCheck === 'true';
      const forceUpload =
        options.forceUpload === true || options.forceUpload === 'true';

      // PASO 1: Verificar documentos eliminados reutilizables
      this.logger.log(
        'PASO 1 - Verificando documentos eliminados reutilizables...',
        {
          fileName: file.originalname,
          fileSize: file.size,
          userId: userId,
          autoRestoreEnabled: true,
        },
      );

      const deletedCheckRequest = new CheckDeletedDocumentRequest(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
        {
          skipTextExtraction: false,
          autoRestore: true, // Siempre activar auto-restauración por defecto
        },
      );

      const deletedResult =
        await this.checkDeletedDocumentUseCase.execute(deletedCheckRequest);

      // Log específico del resultado de la verificación de eliminados
      this.logger.log(
        `PASO 1 - Resultado verificación eliminados: ${deletedResult.status}`,
        {
          status: deletedResult.status,
          deletedDocumentFound: !!deletedResult.deletedDocument,
          deletedDocumentId: deletedResult.deletedDocument?.id,
          restorationAttempted: !!deletedResult.restoredDocument,
          fileName: file.originalname,
        },
      );

      if (
        deletedResult.status === 'exact_match' ||
        deletedResult.status === 'text_match' ||
        deletedResult.status === 'restored'
      ) {
        const matchType =
          deletedResult.status === 'exact_match'
            ? 'HASH BINARIO'
            : deletedResult.status === 'text_match'
              ? 'HASH DE TEXTO'
              : 'RESTAURACIÓN';

        this.logger.log(
          `PASO 1 - ENCONTRADO documento eliminado reutilizable (${matchType}): ${deletedResult.deletedDocument?.id}`,
          {
            matchType: deletedResult.status,
            deletedDocumentId: deletedResult.deletedDocument?.id,
            deletedDocumentName: deletedResult.deletedDocument?.originalName,
            deletedAt: deletedResult.deletedDocument?.updatedAt,
            autoRestoreEnabled: true,
          },
        );

        if (deletedResult.restoredDocument) {
          this.logger.log(
            `PASO 1 - ÉXITO: Documento restaurado automáticamente: ${deletedResult.restoredDocument.id}`,
            {
              restoredDocumentId: deletedResult.restoredDocument.id,
              originalName: deletedResult.restoredDocument.originalName,
              fileName: deletedResult.restoredDocument.fileName,
              wasDeletedAt: deletedResult.deletedDocument?.updatedAt,
              restoredAt: deletedResult.restoredDocument.updatedAt,
              matchType: deletedResult.status,
            },
          );
          return new UnifiedUploadResponseDto(
            'restored',
            `Documento restaurado automáticamente. El archivo "${file.originalname}" ya existía en el sistema y fue restaurado.`,
            {
              id: deletedResult.restoredDocument.id,
              fileName: deletedResult.restoredDocument.fileName,
              originalName: deletedResult.restoredDocument.originalName,
              mimeType: deletedResult.restoredDocument.mimeType,
              size: deletedResult.restoredDocument.size,
              downloadUrl: deletedResult.restoredDocument.url,
              uploadedAt: deletedResult.restoredDocument.updatedAt,
            },
            undefined,
            undefined,
            true,
            deletedResult.deletedDocument?.updatedAt,
          );
        } else {
          this.logger.warn(
            `PASO 1 - PROBLEMA: Documento eliminado encontrado pero no pudo ser restaurado`,
            {
              deletedDocumentId: deletedResult.deletedDocument?.id,
              status: deletedResult.status,
              fileName: file.originalname,
            },
          );
        }
      } else {
        this.logger.log(
          `PASO 1 - No se encontraron documentos eliminados reutilizables (${deletedResult.status})`,
          {
            status: deletedResult.status,
            fileName: file.originalname,
            proceedingToStep2: true,
          },
        );
      }

      // PASO 2: Verificar duplicados en documentos activos y generar embeddings reutilizables
      let preGeneratedChunks: any[] = [];
      let preGeneratedEmbeddings: number[][] = [];
      let extractedText: string = '';

      if (!skipSimilarityCheck && !forceUpload) {
        this.logger.log(
          'PASO 2 - Verificando similitud con documentos activos...',
          {
            fileName: file.originalname,
            userId: userId,
            skipSimilarityCheck: false,
            forceUpload: false,
            similarityThreshold: options.similarityThreshold || 0.7,
            maxCandidates: options.maxSimilarCandidates || 5,
          },
        );

        const similarityRequest = new CheckDocumentSimilarityRequest(
          file.buffer,
          file.originalname,
          file.mimetype,
          userId,
          {
            similarityThreshold: options.similarityThreshold || 0.7,
            maxCandidates: options.maxSimilarCandidates || 5,
            skipEmbeddings: false,
            useSampling: true,
            returnGeneratedData: true, // NUEVO: solicitar que devuelva chunks y embeddings generados
          },
        );

        const similarityResult =
          await this.checkDocumentSimilarityUseCase.execute(similarityRequest);

        // Log específico del resultado de la verificación de similitud
        this.logger.log(
          `PASO 2 - Resultado verificación similitud: ${similarityResult.status}`,
          {
            status: similarityResult.status,
            existingDocumentFound: !!similarityResult.existingDocument,
            existingDocumentId: similarityResult.existingDocument?.id,
            candidatesFound: similarityResult.similarCandidates?.length || 0,
            fileName: file.originalname,
            generatedDataAvailable: !!similarityResult.generatedData,
          },
        );

        // Extraer datos pre-generados para reutilizar (si están disponibles)
        if (similarityResult.generatedData) {
          preGeneratedChunks = similarityResult.generatedData.chunks || [];
          preGeneratedEmbeddings =
            similarityResult.generatedData.embeddings || [];
          extractedText = similarityResult.generatedData.extractedText || '';
          this.logger.log(
            `PASO 2 - OPTIMIZACIÓN: Reutilizando ${preGeneratedChunks.length} chunks y ${preGeneratedEmbeddings.length} embeddings pre-generados`,
            {
              chunksCount: preGeneratedChunks.length,
              embeddingsCount: preGeneratedEmbeddings.length,
              extractedTextLength: extractedText.length,
              fileName: file.originalname,
              optimizationEnabled: true,
            },
          );
        } else {
          this.logger.warn(`PASO 2 - Sin datos pre-generados para reutilizar`, {
            fileName: file.originalname,
            status: similarityResult.status,
            optimizationMissed: true,
          });
        }

        // Rechazar duplicados exactos con detalle específico del tipo
        if (similarityResult.status === 'exact_match') {
          this.logger.warn(
            'PASO 2 - RECHAZADO: Documento duplicado por HASH BINARIO',
            {
              fileName: file.originalname,
              status: similarityResult.status,
              existingDocumentId: similarityResult.existingDocument?.id,
              existingDocumentName:
                similarityResult.existingDocument?.originalName,
              uploadedBy: similarityResult.existingDocument?.uploadedBy,
              uploadedAt: similarityResult.existingDocument?.uploadedAt,
              duplicateType: 'BINARY_HASH',
            },
          );

          throw new HttpException(
            {
              statusCode: HttpStatus.CONFLICT,
              message: `Este archivo ya existe exactamente en el sistema (hash binario idéntico).`,
              error: 'Duplicate Document - Binary Hash',
              details: {
                existingDocumentId: similarityResult.existingDocument!.id,
                matchType: 'binary_hash',
                originalName: similarityResult.existingDocument!.originalName,
                uploadedAt: similarityResult.existingDocument!.uploadedAt,
                uploadedBy: similarityResult.existingDocument!.uploadedBy,
              },
            },
            HttpStatus.CONFLICT,
          );
        }

        if (similarityResult.status === 'text_hash_match') {
          this.logger.warn(
            'PASO 2 - RECHAZADO: Documento duplicado por HASH DE TEXTO',
            {
              fileName: file.originalname,
              status: similarityResult.status,
              existingDocumentId: similarityResult.existingDocument?.id,
              existingDocumentName:
                similarityResult.existingDocument?.originalName,
              uploadedBy: similarityResult.existingDocument?.uploadedBy,
              uploadedAt: similarityResult.existingDocument?.uploadedAt,
              duplicateType: 'TEXT_HASH',
            },
          );

          throw new HttpException(
            {
              statusCode: HttpStatus.CONFLICT,
              message: `Este archivo tiene contenido idéntico a un documento existente (hash de texto).`,
              error: 'Duplicate Document - Text Hash',
              details: {
                existingDocumentId: similarityResult.existingDocument!.id,
                matchType: 'text_hash',
                originalName: similarityResult.existingDocument!.originalName,
                uploadedAt: similarityResult.existingDocument!.uploadedAt,
                uploadedBy: similarityResult.existingDocument!.uploadedBy,
              },
            },
            HttpStatus.CONFLICT,
          );
        }

        // Rechazar documentos similares con detalle específico
        if (
          similarityResult.status === 'candidates' &&
          similarityResult.similarCandidates &&
          similarityResult.similarCandidates.length > 0
        ) {
          this.logger.warn(
            'PASO 2 - RECHAZADO: Documentos similares encontrados',
            {
              fileName: file.originalname,
              candidatesCount: similarityResult.similarCandidates.length,
              candidateDetails: similarityResult.similarCandidates.map((c) => ({
                id: c.id,
                originalName: c.originalName,
                similarityScore: c.similarityScore,
                avgSimilarity: c.avgSimilarity,
                coverage: c.coverage,
                matchedChunks: c.matchedChunks,
                totalChunks: c.totalChunks,
              })),
              rejectionReason: 'SIMILAR_DOCUMENTS_FOUND',
              duplicateType: 'SIMILARITY_CANDIDATES',
            },
          );

          throw new HttpException(
            {
              statusCode: HttpStatus.CONFLICT,
              message: `Se encontraron ${similarityResult.similarCandidates.length} documento(s) similar(es). No se permite la subida para evitar duplicados.`,
              error: 'Similar Documents Found',
              details: {
                matchType: 'similarity_candidates',
                candidatesCount: similarityResult.similarCandidates.length,
                similarDocuments: similarityResult.similarCandidates.map(
                  (candidate) => ({
                    id: candidate.id,
                    originalName: candidate.originalName,
                    documentTitle: candidate.documentTitle || null,
                    documentAuthor: candidate.documentAuthor || null,
                    uploadedAt: candidate.uploadedAt,
                    uploadedBy: candidate.uploadedBy,
                    similarityScore: candidate.similarityScore,
                    details: {
                      avgSimilarity: candidate.avgSimilarity,
                      coverage: candidate.coverage,
                      matchedChunks: candidate.matchedChunks,
                      totalChunks: candidate.totalChunks,
                    },
                  }),
                ),
              },
            },
            HttpStatus.CONFLICT,
          );
        } else {
          this.logger.log(
            `PASO 2 - No se encontraron candidatos similares (${similarityResult.status})`,
            {
              status: similarityResult.status,
              fileName: file.originalname,
              proceedingToStep3: true,
              optimizationEnabled: preGeneratedChunks.length > 0,
            },
          );
        }
      } else {
        this.logger.log(
          'PASO 2 - OMITIDO: Verificación de similitud deshabilitada',
          {
            skipSimilarityCheck: skipSimilarityCheck,
            forceUpload: forceUpload,
            fileName: file.originalname,
            proceedingToStep3: true,
          },
        );
      }

      // PASO 3: Subida normal REUTILIZANDO datos pre-generados (sin conflictos)
      this.logger.log(
        'PASO 3 - Procediendo con subida normal del documento...',
        {
          fileName: file.originalname,
          userId: userId,
          optimizationEnabled: preGeneratedChunks.length > 0,
          chunksToReuse: preGeneratedChunks.length,
          embeddingsToReuse: preGeneratedEmbeddings.length,
          extractedTextLength: extractedText.length,
        },
      );

      const document = await this.uploadDocumentUseCase.execute(file, userId, {
        preGeneratedChunks,
        preGeneratedEmbeddings,
        extractedText,
        reuseGeneratedData: preGeneratedChunks.length > 0,
      });

      this.logger.log('PASO 3 - ÉXITO: Documento subido exitosamente', {
        uploadedDocumentId: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        uploadedAt: document.uploadedAt,
        optimizationUsed: preGeneratedChunks.length > 0,
        chunksReused: preGeneratedChunks.length,
        embeddingsReused: preGeneratedEmbeddings.length,
        extractedTextReused: extractedText.length > 0,
        uploadFlow: 'normal_upload',
      });

      this.logger.log('Documento subido exitosamente', {
        documentId: document.id,
        fileName: document.fileName,
        originalName: document.originalName,
        size: document.size,
        uploadFlow: 'normal_upload_final_success',
        optimizationUsed: preGeneratedChunks.length > 0,
        totalProcessingSteps: 3,
      });

      return new UnifiedUploadResponseDto(
        'uploaded',
        'Documento subido exitosamente',
        {
          id: document.id,
          fileName: document.fileName,
          originalName: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          downloadUrl: document.url,
          uploadedAt: document.uploadedAt,
        },
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof HttpException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        'Unexpected error in unified uploadDocument',
        error instanceof Error ? error : errorMessage,
        {
          fileName: file?.originalname,
          fileSize: file?.size,
          errorType: 'UNIFIED_UPLOAD_ERROR',
        },
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al procesar el archivo',
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

      this.logger.error(
        'Unexpected error in downloadDocument',
        error instanceof Error ? error : errorMessage,
        {
          documentId,
          errorType: 'DOWNLOAD_ERROR',
        },
      );

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

      this.logger.error(
        'Unexpected error in processDocumentText',
        error instanceof Error ? error : errorMessage,
        {
          documentId,
          operation: 'text_extraction',
          errorType: 'PROCESSING_ERROR',
        },
      );

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
        this.logger.logChunkOperation(
          'process',
          documentId,
          result.savedChunks.length,
          {
            processingTimeMs: result.processingTimeMs,
            statistics: result.chunkingResult.statistics,
          },
        );

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
        this.logger.error(
          'Chunk processing failed',
          JSON.stringify(result.errors),
          {
            documentId,
            operation: 'chunk_processing',
            errors: result.errors,
          },
        );

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

      this.logger.error(
        'Unexpected error in processDocumentChunks',
        error instanceof Error ? error : errorMessage,
        {
          documentId,
          operation: 'chunk_processing',
          errorType: 'CHUNK_PROCESSING_ERROR',
        },
      );

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
  async getDocumentChunks(@Param('documentId') documentId: string) {
    try {
      if (!documentId) {
        throw new BadRequestException('ID de documento requerido');
      }

      this.logger.logChunkOperation('retrieve', documentId);

      // usar el servicio de chunking para obtener chunks con estadísticas
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
              (chunk.content.length > 200 ? '...' : ''),
            chunkIndex: chunk.chunkIndex,
            type: chunk.type,
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

      this.logger.error(
        'Unexpected error in getDocumentChunks',
        error instanceof Error ? error : errorMessage,
        {
          documentId,
          operation: 'chunk_retrieval',
          errorType: 'CHUNK_RETRIEVAL_ERROR',
        },
      );

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
