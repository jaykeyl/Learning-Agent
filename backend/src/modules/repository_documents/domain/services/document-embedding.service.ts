import { Injectable } from '@nestjs/common';
import type { DocumentChunk } from '../entities/document-chunk.entity';
import type {
  EmbeddingGeneratorPort,
  EmbeddingConfig,
  BatchEmbeddingResult,
} from '../ports/embedding-generator.port';
import type {
  VectorSearchPort,
  SemanticSearchResult,
  VectorSearchOptions,
} from '../ports/vector-search.port';
import type { DocumentChunkRepositoryPort } from '../ports/document-chunk-repository.port';

/**
 * Opciones para generación de embeddings de documento
 */
export interface DocumentEmbeddingOptions {
  /** Configuración de embeddings */
  embeddingConfig?: Partial<EmbeddingConfig>;

  /** Si debe reemplazar embeddings existentes */
  replaceExisting?: boolean;

  /** Procesar en lotes de este tamaño */
  batchSize?: number;

  /** Filtros para chunks específicos */
  chunkFilters?: {
    /** Tipos de chunks a procesar */
    chunkTypes?: string[];

    /** Índices de chunks específicos */
    chunkIndices?: number[];

    /** Tamaño mínimo de contenido */
    minContentLength?: number;
  };
}

/**
 * Resultado del procesamiento de embeddings de documento
 */
export interface DocumentEmbeddingResult {
  /** ID del documento procesado */
  documentId: string;

  /** Resultado del procesamiento en lotes */
  batchResults: BatchEmbeddingResult[];

  /** Número total de chunks procesados */
  totalChunksProcessed: number;

  /** Número de chunks que ya tenían embeddings */
  chunksSkipped: number;

  /** Número de chunks con errores */
  chunksWithErrors: number;

  /** Tiempo total de procesamiento */
  totalProcessingTimeMs: number;

  /** Costo estimado (si está disponible) */
  estimatedCost?: {
    totalTokens: number;
    costPerToken?: number;
    totalCost?: number;
  };

  /** Errores encontrados */
  errors?: string[];
}

/**
 * Servicio de dominio para gestión de embeddings de documentos
 *
 * Coordina la generación de embeddings para chunks y la búsqueda vectorial
 */
@Injectable()
export class DocumentEmbeddingService {
  constructor(
    private readonly embeddingGenerator: EmbeddingGeneratorPort,
    private readonly vectorSearch: VectorSearchPort,
    private readonly chunkRepository: DocumentChunkRepositoryPort,
  ) {}

  /**
   * Genera embeddings para todos los chunks de un documento
   *
   * @param documentId - ID del documento a procesar
   * @param options - Opciones de procesamiento
   */
  async generateDocumentEmbeddings(
    documentId: string,
    options: DocumentEmbeddingOptions = {},
  ): Promise<DocumentEmbeddingResult> {
    const startTime = Date.now();

    try {
      // 1. Obtener chunks del documento
      const chunksResult =
        await this.chunkRepository.findByDocumentId(documentId);
      let chunks = chunksResult.chunks;

      if (chunks.length === 0) {
        throw new Error(
          `No se encontraron chunks para el documento ${documentId}`,
        );
      }

      // 2. Aplicar filtros si se especificaron
      chunks = this.applyChunkFilters(chunks, options.chunkFilters);

      // 3. Filtrar chunks que ya tienen embeddings (si no se debe reemplazar)
      if (!options.replaceExisting) {
        chunks = await this.filterChunksWithoutEmbeddings(chunks);
      }

      // 4. Validar textos antes de procesar
      const validChunks = chunks.filter((chunk) =>
        this.embeddingGenerator.validateText(chunk.content),
      );

      if (validChunks.length === 0) {
        throw new Error('No hay chunks válidos para procesar embeddings');
      }

      // 5. Procesar en lotes
      const batchSize = options.batchSize || 20; // OpenAI permite hasta 2048 inputs
      const batchResults: BatchEmbeddingResult[] = [];
      let totalChunksProcessed = 0;
      let chunksWithErrors = 0;
      const errors: string[] = [];

      for (let i = 0; i < validChunks.length; i += batchSize) {
        const batch = validChunks.slice(i, i + batchSize);
        const texts = batch.map((chunk) => chunk.content);

        try {
          const batchResult =
            await this.embeddingGenerator.generateBatchEmbeddings(
              texts,
              options.embeddingConfig,
            );

          // 6. Almacenar embeddings en la base de datos
          await this.storeEmbeddings(batch, batchResult);

          batchResults.push(batchResult);
          totalChunksProcessed += batchResult.totalEmbeddings;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(
            `Error procesando lote ${i / batchSize + 1}: ${errorMessage}`,
          );
          chunksWithErrors += batch.length;
        }
      }

      const totalProcessingTimeMs = Date.now() - startTime;

      // 7. Calcular estadísticas finales
      const totalTokens = batchResults.reduce(
        (sum, result) => sum + result.totalTokensUsed,
        0,
      );
      const chunksSkipped = chunksResult.chunks.length - validChunks.length;

      return {
        documentId,
        batchResults,
        totalChunksProcessed,
        chunksSkipped,
        chunksWithErrors,
        totalProcessingTimeMs,
        estimatedCost: {
          totalTokens,
          costPerToken: 0.00002, // Precio aproximado de text-embedding-3-small
          totalCost: totalTokens * 0.00002,
        },
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Error generando embeddings para documento ${documentId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Realiza búsqueda semántica en todos los documentos
   *
   * @param query - Texto de búsqueda
   * @param options - Opciones de búsqueda
   */
  async searchDocuments(
    query: string,
    options?: VectorSearchOptions,
  ): Promise<SemanticSearchResult> {
    return this.vectorSearch.searchByText(query, options);
  }

  /**
   * Encuentra chunks similares a uno específico
   *
   * @param chunkId - ID del chunk de referencia
   * @param options - Opciones de búsqueda
   */
  async findSimilarChunks(chunkId: string, options?: VectorSearchOptions) {
    return this.vectorSearch.findSimilarChunks(chunkId, options);
  }

  /**
   * Encuentra documentos similares a uno específico
   *
   * @param documentId - ID del documento de referencia
   * @param options - Opciones de búsqueda
   */
  async findSimilarDocuments(
    documentId: string,
    options?: VectorSearchOptions,
  ) {
    return this.vectorSearch.findSimilarDocuments(documentId, options);
  }

  /**
   * Verifica si un documento tiene embeddings generados
   *
   * @param documentId - ID del documento a verificar
   */
  async hasEmbeddings(documentId: string): Promise<boolean> {
    // Implementar verificación en el repositorio
    // Por ahora, asumimos que si hay chunks, podrían tener embeddings
    const chunks = await this.chunkRepository.findByDocumentId(documentId);
    return chunks.chunks.length > 0;
  }

  // ============ MÉTODOS PRIVADOS ============

  /**
   * Aplica filtros a los chunks
   */
  private applyChunkFilters(
    chunks: DocumentChunk[],
    filters?: DocumentEmbeddingOptions['chunkFilters'],
  ): DocumentChunk[] {
    if (!filters) return chunks;

    let filtered = chunks;

    if (filters.chunkTypes) {
      filtered = filtered.filter((chunk) =>
        filters.chunkTypes!.includes(chunk.type),
      );
    }

    if (filters.chunkIndices) {
      filtered = filtered.filter((chunk) =>
        filters.chunkIndices!.includes(chunk.chunkIndex),
      );
    }

    if (filters.minContentLength) {
      filtered = filtered.filter(
        (chunk) => chunk.content.length >= filters.minContentLength!,
      );
    }

    return filtered;
  }

  /**
   * Filtra chunks que ya tienen embeddings
   */
  private async filterChunksWithoutEmbeddings(
    chunks: DocumentChunk[],
  ): Promise<DocumentChunk[]> {
    // Verificar cada chunk individualmente
    const chunksWithoutEmbeddings: DocumentChunk[] = [];

    for (const chunk of chunks) {
      const hasEmbedding = await this.chunkRepository.hasEmbedding(chunk.id);
      if (!hasEmbedding) {
        chunksWithoutEmbeddings.push(chunk);
      }
    }

    return chunksWithoutEmbeddings;
  }

  /**
   * Almacena embeddings en la base de datos usando pgvector
   */
  private async storeEmbeddings(
    chunks: DocumentChunk[],
    batchResult: BatchEmbeddingResult,
  ): Promise<void> {
    try {
      // Preparar actualizaciones para el lote
      const updates = chunks.map((chunk, index) => ({
        chunkId: chunk.id,
        embedding: batchResult.embeddings[index],
      }));

      // Actualizar embeddings en lote
      await this.chunkRepository.updateBatchEmbeddings(updates);

    } catch (error) {
      console.error('Error almacenando embeddings:', error);
      throw new Error(`Error almacenando embeddings: ${error}`);
    }
  }
}
