import {
  Controller,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ContextualLoggerService } from '../services/contextual-logger.service';
import { GenerateDocumentEmbeddingsUseCase } from '../../application/use-cases/generate-document-embeddings.use-case';
import { SearchDocumentsUseCase } from '../../application/use-cases/search-documents.use-case';

/**
 * DTO para generar embeddings de documento
 */
export class GenerateEmbeddingsDto {
  /** Configuración de embeddings */
  embeddingConfig?: {
    model?: string;
    dimensions?: number;
    additionalConfig?: Record<string, any>;
  };

  /** Si debe reemplazar embeddings existentes */
  replaceExisting?: boolean = false;

  /** Tamaño de lote para procesamiento */
  batchSize?: number = 20;

  /** Filtros para chunks específicos */
  chunkFilters?: {
    chunkTypes?: string[];
    chunkIndices?: number[];
    minContentLength?: number;
  };
}

/**
 * DTO para búsqueda semántica
 */
export class SemanticSearchDto {
  /** Texto de búsqueda */
  @IsString({ message: 'La consulta debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La consulta de búsqueda es requerida' })
  query: string;

  /** Opciones de búsqueda */
  @IsOptional()
  searchOptions?: {
    limit?: number;
    similarityThreshold?: number;
    documentIds?: string[];
    chunkTypes?: string[];
    additionalFilters?: Record<string, any>;
  };

  /** Si debe incluir metadatos extendidos */
  @IsOptional()
  @IsBoolean({ message: 'includeMetadata debe ser un booleano' })
  includeMetadata?: boolean = true;

  /** Si debe incluir contenido completo de chunks */
  @IsOptional()
  @IsBoolean({ message: 'includeContent debe ser un booleano' })
  includeContent?: boolean = true;
}

/**
 * Controlador para funcionalidades de embeddings y búsqueda semántica
 *
 * Maneja las operaciones de generación de embeddings vectoriales
 * y búsqueda por similaridad semántica
 */
@ApiTags('Repository Documents - Embeddings')
@Controller('api/repository-documents/embeddings')
export class EmbeddingsController {
  private readonly logger = new Logger(EmbeddingsController.name);

  constructor(
    private readonly generateEmbeddingsUseCase: GenerateDocumentEmbeddingsUseCase,
    private readonly searchDocumentsUseCase: SearchDocumentsUseCase,
    private readonly contextualLogger: ContextualLoggerService,
  ) {}

  /**
   * Genera embeddings para todos los chunks de un documento
   */
  @Post('generate/:documentId')
  @ApiOperation({
    summary: 'Generar embeddings para un documento',
    description:
      'Procesa todos los chunks de un documento y genera embeddings vectoriales usando OpenAI',
  })
  @ApiParam({
    name: 'documentId',
    description: 'ID único del documento a procesar',
    example: 'doc_123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: GenerateEmbeddingsDto,
    description: 'Configuración para la generación de embeddings',
    examples: {
      basic: {
        summary: 'Configuración básica',
        value: {
          replaceExisting: false,
          batchSize: 20,
        },
      },
      advanced: {
        summary: 'Configuración avanzada',
        value: {
          embeddingConfig: {
            model: 'text-embedding-3-small',
            dimensions: 1536,
          },
          replaceExisting: true,
          batchSize: 50,
          chunkFilters: {
            chunkTypes: ['paragraph', 'heading'],
            minContentLength: 100,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Embeddings generados exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            totalChunksProcessed: { type: 'number' },
            chunksSkipped: { type: 'number' },
            chunksWithErrors: { type: 'number' },
            totalProcessingTimeMs: { type: 'number' },
            estimatedCost: {
              type: 'object',
              properties: {
                totalTokens: { type: 'number' },
                totalCost: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Documento no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async generateEmbeddings(
    @Param('documentId') documentId: string,
    @Body() dto: GenerateEmbeddingsDto,
  ) {
    try {
      this.logger.log(
        ` Iniciando generación de embeddings para documento: ${documentId}`,
      );
      const startTime = Date.now();

      // Ejecutar caso de uso
      const result = await this.generateEmbeddingsUseCase.execute({
        documentId,
        ...dto,
      });

      const processingTime = Date.now() - startTime;

      if (!result.success) {
        this.logger.error(`❌ Error generando embeddings: ${result.error}`);
        throw new HttpException(
          {
            message: result.error,
            errorCode: result.errorCode,
            documentId,
          },
          this.getHttpStatusFromErrorCode(result.errorCode),
        );
      }

      this.logger.log(
        `✅ Embeddings generados exitosamente para ${documentId} en ${processingTime}ms`,
      );

      return {
        success: true,
        result: result.result,
        metadata: {
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error en controlador de embeddings:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Error interno generando embeddings',
          error: error instanceof Error ? error.message : 'Unknown error',
          documentId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Realiza búsqueda semántica en los documentos
   */
  @Post('search')
  @ApiOperation({
    summary: 'Búsqueda semántica de documentos',
    description:
      'Busca documentos y chunks por similaridad semántica usando embeddings vectoriales',
  })
  @ApiBody({
    type: SemanticSearchDto,
    description: 'Parámetros de búsqueda semántica',
    examples: {
      basic: {
        summary: 'Búsqueda básica',
        value: {
          query: '¿Qué es inteligencia artificial?',
        },
      },
      advanced: {
        summary: 'Búsqueda avanzada',
        value: {
          query: 'algoritmos de machine learning',
          searchOptions: {
            limit: 15,
            similarityThreshold: 0.8,
            chunkTypes: ['paragraph'],
          },
          includeMetadata: true,
          includeContent: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Búsqueda realizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        result: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            totalResults: { type: 'number' },
            chunks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  similarityScore: { type: 'number' },
                  documentTitle: { type: 'string' },
                },
              },
            },
          },
        },
        searchInfo: {
          type: 'object',
          properties: {
            processingTimeMs: { type: 'number' },
            processedQuery: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de búsqueda inválidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async searchDocuments(@Body() dto: SemanticSearchDto) {
    try {
      // Debug: Ver qué está llegando
      this.logger.log(` DTO recibido:`, JSON.stringify(dto, null, 2));
      this.logger.log(` Tipo de dto:`, typeof dto);
      this.logger.log(` Tipo de query:`, typeof dto?.query);
      this.logger.log(` Query value:`, dto?.query);

      // Validación adicional de entrada
      if (!dto || !dto.query || typeof dto.query !== 'string') {
        this.logger.error(`❌ Validación fallida:`, {
          dto: !!dto,
          query: dto?.query,
          queryType: typeof dto?.query,
        });
        throw new HttpException(
          {
            message:
              'La consulta de búsqueda es requerida y debe ser una cadena válida',
            errorCode: 'INVALID_REQUEST',
            receivedData: {
              dto: !!dto,
              query: dto?.query,
              queryType: typeof dto?.query,
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`🔍 Iniciando búsqueda semántica: "${dto.query}"`);
      const startTime = Date.now();

      // Ejecutar caso de uso
      const result = await this.searchDocumentsUseCase.execute(dto);

      const processingTime = Date.now() - startTime;

      if (!result.success) {
        this.logger.error(`❌ Error en búsqueda semántica: ${result.error}`);
        throw new HttpException(
          {
            message: result.error,
            errorCode: result.errorCode,
            query: dto.query,
          },
          this.getHttpStatusFromErrorCode(result.errorCode),
        );
      }

      this.logger.log(
        ` Búsqueda completada: ${result.result?.totalResults || 0} resultados en ${processingTime}ms`,
      );

      return {
        success: true,
        result: result.result,
        searchInfo: {
          ...result.searchInfo,
          totalProcessingTimeMs: processingTime,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error en controlador de búsqueda:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Error interno en búsqueda semántica',
          error: error instanceof Error ? error.message : 'Unknown error',
          query: dto.query,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ MÉTODOS PRIVADOS ============

  /**
   * Convierte códigos de error a códigos HTTP apropiados
   */
  private getHttpStatusFromErrorCode(errorCode?: string): HttpStatus {
    switch (errorCode) {
      case 'DOCUMENT_NOT_FOUND':
      case 'NO_CHUNKS_FOUND':
        return HttpStatus.NOT_FOUND;

      case 'VALIDATION_ERROR':
      case 'INVALID_QUERY':
        return HttpStatus.BAD_REQUEST;

      case 'API_ERROR':
      case 'NETWORK_ERROR':
        return HttpStatus.BAD_GATEWAY;

      case 'DATABASE_ERROR':
        return HttpStatus.INTERNAL_SERVER_ERROR;

      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
