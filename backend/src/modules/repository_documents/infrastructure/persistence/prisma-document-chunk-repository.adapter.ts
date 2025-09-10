import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DocumentChunk } from '../../domain/entities/document-chunk.entity';
import type {
  DocumentChunkRepositoryPort,
  FindChunksResult,
  FindChunksOptions,
} from '../../domain/ports/document-chunk-repository.port';

/**
 * Adaptador de repositorio para DocumentChunk usando Prisma
 */
@Injectable()
export class PrismaDocumentChunkRepositoryAdapter
  implements DocumentChunkRepositoryPort
{
  private readonly logger = new Logger(
    PrismaDocumentChunkRepositoryAdapter.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda un chunk en la base de datos
   */
  async save(chunk: DocumentChunk): Promise<DocumentChunk> {
    try {

      const savedChunk = await this.prisma.documentChunk.create({
        data: {
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          startPosition: 0, // Valor por defecto
          endPosition: chunk.content.length, // Valor por defecto
          type: chunk.type,
          wordCount: this.countWords(chunk.content),
          charCount: chunk.content.length,
          metadata: chunk.metadata,
          createdAt: chunk.createdAt,
        },
      });

      return this.mapToEntity(savedChunk);
    } catch (error) {
      this.logger.error(`Error guardando chunk ${chunk.id}:`, error);
      throw new Error(`Error guardando chunk: ${error}`);
    }
  }

  /**
   * Guarda múltiples chunks en una transacción (más eficiente)
   */
  async saveMany(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (chunks.length === 0) {
      return [];
    }

    try {
      this.logger.log(`Guardando ${chunks.length} chunks en transacción...`);

      const savedChunks = await this.prisma.$transaction(
        chunks.map((chunk) =>
          this.prisma.documentChunk.create({
            data: {
              id: chunk.id,
              documentId: chunk.documentId,
              content: chunk.content,
              chunkIndex: chunk.chunkIndex,
              startPosition: 0,
              endPosition: chunk.content.length,
              type: chunk.type,
              wordCount: this.countWords(chunk.content),
              charCount: chunk.content.length,
              metadata: chunk.metadata,
              createdAt: chunk.createdAt,
            },
          }),
        ),
      );

      this.logger.log(`${savedChunks.length} chunks guardados exitosamente`);

      return savedChunks.map((chunk) => this.mapToEntity(chunk));
    } catch (error) {
      this.logger.error(`Error guardando ${chunks.length} chunks:`, error);
      throw new Error(`Error guardando chunks en lote: ${error}`);
    }
  }

  /**
   * Busca un chunk por su ID
   */
  async findById(id: string): Promise<DocumentChunk | null> {
    try {
      const chunk = await this.prisma.documentChunk.findUnique({
        where: { id },
      });

      return chunk ? this.mapToEntity(chunk) : null;
    } catch (error) {
      this.logger.error(`Error buscando chunk ${id}:`, error);
      throw new Error(`Error buscando chunk: ${error}`);
    }
  }

  /**
   * Busca todos los chunks de un documento específico
   */
  async findByDocumentId(
    documentId: string,
    options: FindChunksOptions = {},
  ): Promise<FindChunksResult> {
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'chunkIndex',
        orderDirection = 'asc',
      } = options;

      const [chunks, total] = await Promise.all([
        this.prisma.documentChunk.findMany({
          where: { documentId },
          orderBy: { [orderBy]: orderDirection },
          take: limit,
          skip: offset,
        }),
        this.prisma.documentChunk.count({
          where: { documentId },
        }),
      ]);

      return {
        chunks: chunks.map((chunk) => this.mapToEntity(chunk)),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error buscando chunks del documento ${documentId}:`,
        error,
      );
      throw new Error(`Error buscando chunks del documento: ${error}`);
    }
  }

  /**
   * Busca chunks por tipo
   */
  async findByType(
    type: string,
    options: FindChunksOptions = {},
  ): Promise<FindChunksResult> {
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = options;

      const [chunks, total] = await Promise.all([
        this.prisma.documentChunk.findMany({
          where: { type: type },
          orderBy: { [orderBy]: orderDirection },
          take: limit,
          skip: offset,
        }),
        this.prisma.documentChunk.count({
          where: { type: type },
        }),
      ]);

      return {
        chunks: chunks.map((chunk) => this.mapToEntity(chunk)),
        total,
      };
    } catch (error) {
      this.logger.error(`Error buscando chunks del tipo ${type}:`, error);
      throw new Error(`Error buscando chunks por tipo: ${error}`);
    }
  }

  /**
   * Elimina todos los chunks de un documento
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    try {
      const result = await this.prisma.documentChunk.deleteMany({
        where: { documentId },
      });

      this.logger.log(
        `Eliminados ${result.count} chunks del documento ${documentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error eliminando chunks del documento ${documentId}:`,
        error,
      );
      throw new Error(`Error eliminando chunks del documento: ${error}`);
    }
  }

  /**
   * Elimina un chunk específico
   */
  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.documentChunk.delete({
        where: { id },
      });

    } catch (error) {
      this.logger.error(`Error eliminando chunk ${id}:`, error);
      throw new Error(`Error eliminando chunk: ${error}`);
    }
  }

  /**
   * Cuenta el número total de chunks de un documento
   */
  async countByDocumentId(documentId: string): Promise<number> {
    try {
      return await this.prisma.documentChunk.count({
        where: { documentId },
      });
    } catch (error) {
      this.logger.error(
        `Error contando chunks del documento ${documentId}:`,
        error,
      );
      throw new Error(`Error contando chunks: ${error}`);
    }
  }

  /**
   * Verifica si existen chunks para un documento
   */
  async existsByDocumentId(documentId: string): Promise<boolean> {
    try {
      const count = await this.prisma.documentChunk.count({
        where: { documentId },
        take: 1, // Solo necesitamos saber si existe al menos uno
      });

      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error verificando chunks del documento ${documentId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Obtiene estadísticas de chunks para un documento
   */
  async getDocumentChunkStatistics(documentId: string): Promise<{
    totalChunks: number;
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalContentLength: number;
  }> {
    try {
      // Query raw para obtener todas las estadísticas de una vez
      const contentStats = await this.prisma.$queryRaw<
        Array<{
          total_chunks: number;
          min_length: number;
          max_length: number;
          avg_length: number;
          total_length: number;
        }>
      >`
        SELECT 
          COUNT(*) as total_chunks,
          MIN(LENGTH(content)) as min_length,
          MAX(LENGTH(content)) as max_length,
          AVG(LENGTH(content))::int as avg_length,
          SUM(LENGTH(content)) as total_length
        FROM "document_chunks" 
        WHERE "documentId" = ${documentId}
      `;

      const stats = contentStats[0];

      return {
        totalChunks: Number(stats?.total_chunks) || 0,
        averageChunkSize: stats?.avg_length || 0,
        minChunkSize: stats?.min_length || 0,
        maxChunkSize: stats?.max_length || 0,
        totalContentLength: Number(stats?.total_length) || 0,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo estadísticas del documento ${documentId}:`,
        error,
      );

      // Fallback: estadísticas básicas
      const count = await this.countByDocumentId(documentId);
      return {
        totalChunks: count,
        averageChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalContentLength: 0,
      };
    }
  }

  // ============ MÉTODOS PARA EMBEDDINGS ============

  /**
   * Actualiza el embedding de un chunk específico
   */
  async updateChunkEmbedding(
    chunkId: string,
    embedding: number[],
  ): Promise<void> {
    try {
      // Usar $queryRaw para manejar el tipo vector
      await this.prisma.$queryRaw`
        UPDATE "document_chunks" 
        SET embedding = ${JSON.stringify(embedding)}::vector, 
            "updatedAt" = NOW()
        WHERE id = ${chunkId}
      `;

    } catch (error) {
      this.logger.error(
        `Error actualizando embedding del chunk ${chunkId}:`,
        error,
      );
      throw new Error(`Error actualizando embedding: ${error}`);
    }
  }

  /**
   * Actualiza embeddings de múltiples chunks en lote (más eficiente)
   */
  async updateBatchEmbeddings(
    updates: Array<{ chunkId: string; embedding: number[] }>,
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    try {
      this.logger.log(`Actualizando ${updates.length} embeddings en lote...`);

      // Usar transacción con $queryRaw para manejar el tipo vector
      await this.prisma.$transaction(
        updates.map(
          ({ chunkId, embedding }) =>
            this.prisma.$queryRaw`
            UPDATE "document_chunks" 
            SET embedding = ${JSON.stringify(embedding)}::vector,
                "updatedAt" = NOW()
            WHERE id = ${chunkId}
          `,
        ),
      );

      this.logger.log(`${updates.length} embeddings actualizados exitosamente`);
    } catch (error) {
      this.logger.error(
        `Error actualizando ${updates.length} embeddings:`,
        error,
      );
      throw new Error(`Error actualizando embeddings en lote: ${error}`);
    }
  }

  /**
   * Verifica si un chunk tiene embedding generado
   */
  async hasEmbedding(chunkId: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{ has_embedding: boolean }>
      >`
        SELECT (embedding IS NOT NULL) as has_embedding
        FROM "document_chunks"
        WHERE id = ${chunkId}
      `;

      return result[0]?.has_embedding || false;
    } catch (error) {
      this.logger.error(
        `Error verificando embedding del chunk ${chunkId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Busca chunks que no tienen embeddings generados para un documento
   */
  async findChunksWithoutEmbeddings(
    documentId: string,
    options: FindChunksOptions = {},
  ): Promise<FindChunksResult> {
    try {
      const { limit = 50, offset = 0 } = options;

      // Usar consulta SQL directa para evitar problemas con el tipo vector
      const chunks = await this.prisma.$queryRaw<
        Array<{
          id: string;
          documentId: string;
          content: string;
          chunkIndex: number;
          type: string;
          metadata: any;
          createdAt: Date;
          updatedAt: Date;
        }>
      >`
        SELECT id, "documentId", content, "chunkIndex", type, metadata, "createdAt", "updatedAt"
        FROM "document_chunks"
        WHERE "documentId" = ${documentId} AND embedding IS NULL
        ORDER BY "chunkIndex" ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "document_chunks"
        WHERE "documentId" = ${documentId} AND embedding IS NULL
      `;

      const total = Number(totalResult[0]?.count || 0);

      return {
        chunks: chunks.map((chunk) => this.mapToEntity(chunk)),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error buscando chunks sin embeddings del documento ${documentId}:`,
        error,
      );
      throw new Error(`Error buscando chunks sin embeddings: ${error}`);
    }
  }

  // ============ MÉTODOS PRIVADOS ============

  /**
   * Mapea el resultado de Prisma a la entidad de dominio
   */
  private mapToEntity(prismaChunk: any): DocumentChunk {
    return DocumentChunk.create(
      prismaChunk.id,
      prismaChunk.documentId,
      prismaChunk.content,
      prismaChunk.chunkIndex,
      prismaChunk.type,
      prismaChunk.metadata || {},
      prismaChunk.createdAt,
    );
  }

  /**
   * Mapea el tipo string de la entidad al enum ChunkType de Prisma
   */
  private mapTypeToChunkType(type: string): any {
    const typeMap: Record<string, any> = {
      text: 'TEXT',
      paragraph: 'TEXT',
      sentence_group: 'TEXT',
      word_group: 'TEXT',
      title: 'TITLE',
      table: 'TABLE',
      list: 'LIST',
      code: 'CODE',
      formula: 'FORMULA',
      metadata: 'METADATA',
    };

    return typeMap[type.toLowerCase()] || 'TEXT';
  }

  /**
   * Cuenta el número de palabras en un texto
   */
  private countWords(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    // Dividir por espacios y filtrar elementos vacíos
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }
}