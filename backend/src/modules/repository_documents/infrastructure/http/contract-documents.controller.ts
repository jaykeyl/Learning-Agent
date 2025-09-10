import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContextualLoggerService } from '../services/contextual-logger.service';
import { GetDocumentsBySubjectUseCase } from '../../application/queries/get-documents-by-subject.usecase';
import { GetDocumentContentUseCase } from '../../application/queries/get-document-content.usecase';
import {
  ContractDocumentListResponseDto,
  ContractDocumentItemDto,
  DocumentContentResponseDto,
  DocumentContentMetadataDto,
  GetDocumentsBySubjectQueryDto,
} from './dtos/contract-documents.dto';

/**
 * Controlador para endpoints del contrato con el módulo de estudiantes
 * Base URL: /api/v1/documentos
 */
@Controller('api/v1/documentos')
@UseGuards(AuthGuard('jwt'))
export class ContractDocumentsController {
  constructor(
    private readonly getDocumentsBySubjectUseCase: GetDocumentsBySubjectUseCase,
    private readonly getDocumentContentUseCase: GetDocumentContentUseCase,
    private readonly logger: ContextualLoggerService,
  ) {}

  /**
   * GET /materias/{materiaId}/documentos
   * Obtiene la lista de documentos disponibles para una materia.
   */
  @Get('materias/:materiaId/documentos')
  async getDocumentsBySubject(
    @Param('materiaId') materiaId: string,
    @Query() query: GetDocumentsBySubjectQueryDto,
  ): Promise<ContractDocumentListResponseDto> {
    try {
      this.logger.logDocumentOperation('list', undefined, {
        materiaId,
        query,
      });

      if (!materiaId || !materiaId.trim()) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'ID de materia es requerido',
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.getDocumentsBySubjectUseCase.execute({
        materiaId: materiaId.trim(),
        tipo: query.tipo,
        page: query.page || 1,
        limit: query.limit || 10,
      });

      // Mapear la respuesta del dominio a DTOs del contrato
      const documentos = result.docs.map(
        (doc) =>
          new ContractDocumentItemDto(
            doc.id,
            doc.originalName, // titulo
            this.extractFileType(doc.mimeType), // tipo
            doc.downloadUrl, // url
            doc.uploadedAt, // fechaCarga
            doc.uploadedBy, // profesorId
          ),
      );

      this.logger.log('Documents retrieved successfully for subject', {
        materiaId,
        totalDocuments: result.total,
        documentsReturned: documentos.length,
        page: result.page,
      });

      return new ContractDocumentListResponseDto(
        documentos,
        result.total,
        result.page,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Error retrieving documents by subject',
        error instanceof Error ? error : errorMessage,
        {
          materiaId,
          errorType: 'DOCUMENTS_BY_SUBJECT_ERROR',
        },
      );

      // Manejar diferentes tipos de errores
      if (errorMessage.includes('no encontrado')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Materia no encontrada',
            error: 'Not Found',
            details: errorMessage,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('Servicio de almacenamiento')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Servicio de almacenamiento no disponible',
            error: 'Service Unavailable',
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

  /**
   * GET /documentos/{docId}/contenido
   * Obtiene el contenido extraído de un documento específico.
   */
  @Get(':docId/contenido')
  async getDocumentContent(
    @Param('docId') docId: string,
  ): Promise<DocumentContentResponseDto> {
    try {
      this.logger.logDocumentOperation('download', docId);

      if (!docId || !docId.trim()) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'ID de documento es requerido',
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.getDocumentContentUseCase.execute({
        docId: docId.trim(),
      });

      this.logger.log('Document content retrieved successfully', {
        docId,
        contentLength: result.contenido.length,
        hasMetadata: !!result.metadata,
      });

      return new DocumentContentResponseDto(
        result.contenido,
        new DocumentContentMetadataDto(
          result.metadata.paginas,
          result.metadata.resumen,
        ),
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Error retrieving document content',
        error instanceof Error ? error : errorMessage,
        {
          docId,
          errorType: 'DOCUMENT_CONTENT_ERROR',
        },
      );

      // Manejar diferentes tipos de errores
      if (errorMessage.includes('no encontrado')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Documento no encontrado',
            error: 'Not Found',
            details: errorMessage,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('no tiene contenido de texto extraído')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'El documento no tiene contenido de texto extraído',
            error: 'Bad Request',
            details: errorMessage,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Error genérico
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor al obtener contenido',
          error: 'Internal Server Error',
          details: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extrae el tipo de archivo del mimeType para cumplir con el contrato
   */
  private extractFileType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word')) return 'documento';
    if (mimeType.includes('text')) return 'texto';
    return 'documento';
  }
}
