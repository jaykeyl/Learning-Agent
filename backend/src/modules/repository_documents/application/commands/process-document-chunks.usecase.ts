import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import type {
  DocumentChunkingService,
  ProcessChunksResult,
} from '../../domain/services/document-chunking.service';
import { DocumentStatus } from '../../domain/entities/document.entity';

/**
 * Comando para procesar chunks de un documento
 */
export interface ProcessDocumentChunksCommand {
  /** ID del documento a procesar */
  documentId: string;

  /** Configuración personalizada de chunking (opcional) */
  chunkingConfig?: {
    maxChunkSize?: number;
    overlap?: number;
    respectParagraphs?: boolean;
    respectSentences?: boolean;
    minChunkSize?: number;
  };

  /** Si debe reemplazar chunks existentes */
  replaceExisting?: boolean;

  /** Tipo de chunk personalizado */
  chunkType?: string;
}

/**
 * Caso de uso para procesar chunks de un documento
 *
 * Orquesta el proceso completo de chunking:
 * 1. Validar que el documento existe y tiene texto extraído
 * 2. Procesar chunks usando el servicio de dominio
 * 3. Actualizar el estado del documento
 */
@Injectable()
export class ProcessDocumentChunksUseCase {
  private readonly logger = new Logger(ProcessDocumentChunksUseCase.name);

  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly chunkingService: DocumentChunkingService,
  ) {}

  /**
   * Ejecuta el procesamiento de chunks para un documento
   */
  async execute(
    command: ProcessDocumentChunksCommand,
  ): Promise<ProcessChunksResult> {
    const { documentId, chunkingConfig, replaceExisting, chunkType } = command;

    try {
      this.logger.log(
        `Iniciando procesamiento de chunks para documento: ${documentId}`,
      );

      // 1. Verificar que el documento existe
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        throw new NotFoundException(`Documento no encontrado: ${documentId}`);
      }

      // 2. Verificar que el documento tiene texto extraído
      if (
        !document.extractedText ||
        document.extractedText.trim().length === 0
      ) {
        throw new Error(`El documento ${documentId} no tiene texto extraído`);
      }

      // 3. Verificar el estado del documento
      if (document.status !== DocumentStatus.PROCESSED) {
        this.logger.warn(
          `Documento ${documentId} tiene estado ${document.status}, pero continuando con chunking`,
        );
      }

      // 4. Verificar si ya existen chunks (si no se va a reemplazar)
      if (!replaceExisting) {
        const existingChunks =
          await this.chunkingService.getDocumentChunks(documentId);
        if (existingChunks.total > 0) {
          this.logger.log(
            `Documento ${documentId} ya tiene ${existingChunks.total} chunks existentes. Saltando procesamiento.`,
          );
          return {
            status: 'success',
            savedChunks: existingChunks.chunks,
            chunkingResult: {
              chunks: existingChunks.chunks,
              totalChunks: existingChunks.total,
              statistics: {
                ...existingChunks.statistics,
                actualOverlapPercentage: 0, // No se puede calcular para chunks existentes
              },
            },
            processingTimeMs: 0,
          };
        }
      }

      // 5. Procesar chunks usando el servicio de dominio
      const result = await this.chunkingService.processDocumentChunks(
        documentId,
        document.extractedText,
        {
          chunkingConfig,
          replaceExisting,
          chunkType,
        },
      );

      // 6. Log del resultado
      if (result.status === 'success') {
        this.logger.log(
          `✅ Chunks procesados exitosamente para documento ${documentId}: ` +
            `${result.savedChunks.length} chunks creados en ${result.processingTimeMs}ms`,
        );

        this.logger.log(
          `📊 Estadísticas de chunking: ` +
            `Promedio: ${result.chunkingResult.statistics.averageChunkSize} chars, ` +
            `Min: ${result.chunkingResult.statistics.minChunkSize} chars, ` +
            `Max: ${result.chunkingResult.statistics.maxChunkSize} chars, ` +
            `Overlap: ${result.chunkingResult.statistics.actualOverlapPercentage.toFixed(1)}%`,
        );
      } else {
        this.logger.error(
          `❌ Error procesando chunks para documento ${documentId}: ` +
            `${result.errors?.join(', ')}`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error procesando chunks para documento ${documentId}: ${errorMessage}`,
      );

      // Retornar resultado de error estructurado
      return {
        chunkingResult: {
          chunks: [],
          totalChunks: 0,
          statistics: {
            averageChunkSize: 0,
            minChunkSize: 0,
            maxChunkSize: 0,
            actualOverlapPercentage: 0,
          },
        },
        savedChunks: [],
        processingTimeMs: 0,
        status: 'error',
        errors: [errorMessage],
      };
    }
  }

  /**
   * Verifica si un documento ya tiene chunks procesados
   */
  async hasProcessedChunks(documentId: string): Promise<boolean> {
    try {
      return await this.chunkingService.hasProcessedChunks(documentId);
    } catch (error) {
      this.logger.error(
        `Error verificando chunks para documento ${documentId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Re-procesa chunks de un documento existente
   */
  async reprocessChunks(documentId: string): Promise<ProcessChunksResult> {
    return this.execute({
      documentId,
      replaceExisting: true,
    });
  }
}
