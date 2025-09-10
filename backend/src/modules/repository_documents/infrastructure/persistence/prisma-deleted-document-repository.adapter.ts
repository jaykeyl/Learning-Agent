import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DeletedDocumentRepositoryPort } from '../../domain/ports/deleted-document-repository.port';
import {
  Document,
  DocumentStatus,
} from '../../domain/entities/document.entity';

@Injectable()
export class PrismaDeletedDocumentRepositoryAdapter
  implements DeletedDocumentRepositoryPort
{
  private readonly logger = new Logger(
    PrismaDeletedDocumentRepositoryAdapter.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  async findDeletedByFileHash(fileHash: string): Promise<Document | undefined> {
    try {
      this.logger.log(`buscando documento eliminado con hash: ${fileHash}`);
      
      // Buscar todos los documentos DELETED para debugging
      const allDeletedDocs = await this.prisma.document.findMany({
        where: {
          status: 'DELETED',
        },
        select: {
          id: true,
          originalName: true,
          fileHash: true,
        }
      });
      
      this.logger.log(`documentos eliminados en BD: ${JSON.stringify(allDeletedDocs, null, 2)}`);
      
      const document = await this.prisma.document.findFirst({
        where: {
          fileHash,
          status: 'DELETED',
        },
      });

      this.logger.log(`resultado búsqueda por hash: ${document ? `encontrado documento ${document.id}` : 'no encontrado'}`);

      return document ? this.mapToDomain(document) : undefined;
    } catch (error) {
      this.logger.error(
        `error buscando documento eliminado por hash ${fileHash}: ${error.message}`,
      );
      throw new Error(
        `falló la búsqueda de documento eliminado por hash: ${error.message}`,
      );
    }
  }

  async findDeletedByTextHash(textHash: string): Promise<Document | undefined> {
    try {
      const document = await this.prisma.document.findFirst({
        where: {
          textHash,
          status: 'DELETED',
        },
      });

      return document ? this.mapToDomain(document) : undefined;
    } catch (error) {
      this.logger.error(
        `error buscando documento eliminado por hash de texto ${textHash}: ${error.message}`,
      );
      throw new Error(
        `falló la búsqueda de documento eliminado por hash de texto: ${error.message}`,
      );
    }
  }

  async findSimilarDeletedDocuments(
    fileHash?: string,
    textHash?: string,
  ): Promise<Document[]> {
    try {
      const whereConditions: any = {
        status: 'DELETED',
      };

      if (fileHash || textHash) {
        whereConditions.OR = [];
        if (fileHash) {
          whereConditions.OR.push({ fileHash });
        }
        if (textHash) {
          whereConditions.OR.push({ textHash });
        }
      }

      const documents = await this.prisma.document.findMany({
        where: whereConditions,
        orderBy: { updatedAt: 'desc' }, // los eliminados más recientemente primero
        take: 10, // limitar resultados
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(
        `error buscando documentos eliminados similares: ${error.message}`,
      );
      throw new Error(
        `falló la búsqueda de documentos eliminados similares: ${error.message}`,
      );
    }
  }

  async restoreDocument(documentId: string): Promise<Document | undefined> {
    try {
      const restoredDocument = await this.prisma.document.update({
        where: {
          id: documentId,
          status: 'DELETED', // solo restaurar si está marcado como eliminado
        },
        data: {
          status: 'UPLOADED', // cambiar estado a uploaded para reprocesamiento
          updatedAt: new Date(),
        },
      });

      this.logger.log(`documento restaurado: ${documentId}`);
      return this.mapToDomain(restoredDocument);
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(
          `documento no encontrado o no eliminado: ${documentId}`,
        );
        return undefined;
      }
      this.logger.error(
        `error restaurando documento ${documentId}: ${error.message}`,
      );
      throw new Error(`falló la restauración del documento: ${error.message}`);
    }
  }

  async findAllDeleted(offset = 0, limit = 50): Promise<Document[]> {
    try {
      const documents = await this.prisma.document.findMany({
        where: { status: 'DELETED' },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' }, // los eliminados más recientemente primero
      });

      return documents.map((doc) => this.mapToDomain(doc));
    } catch (error) {
      this.logger.error(
        `error obteniendo documentos eliminados: ${error.message}`,
      );
      throw new Error(
        `falló la obtención de documentos eliminados: ${error.message}`,
      );
    }
  }

  async countDeleted(): Promise<number> {
    try {
      return await this.prisma.document.count({
        where: { status: 'DELETED' },
      });
    } catch (error) {
      this.logger.error(
        `error contando documentos eliminados: ${error.message}`,
      );
      throw new Error(
        `falló el conteo de documentos eliminados: ${error.message}`,
      );
    }
  }

  async permanentlyDelete(documentId: string): Promise<boolean> {
    try {
      await this.prisma.document.delete({
        where: {
          id: documentId,
          status: 'DELETED', // solo eliminar permanentemente si está marcado como eliminado
        },
      });
      this.logger.log(`documento eliminado permanentemente: ${documentId}`);
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(
          `documento no encontrado o no eliminado: ${documentId}`,
        );
        return false;
      }
      this.logger.error(
        `error eliminando permanentemente documento ${documentId}: ${error.message}`,
      );
      throw new Error(
        `falló la eliminación permanente del documento: ${error.message}`,
      );
    }
  }

  /**
   * convierte un documento de prisma a entidad de dominio
   */
  private mapToDomain(prismaDocument: any): Document {
    return new Document(
      prismaDocument.id,
      prismaDocument.storedName,
      prismaDocument.originalName,
      prismaDocument.contentType,
      prismaDocument.size,
      this.buildDocumentUrl(prismaDocument.s3Key),
      prismaDocument.s3Key,
      prismaDocument.fileHash,
      prismaDocument.uploadedBy,
      prismaDocument.status as DocumentStatus,
      prismaDocument.extractedText,
      prismaDocument.textHash,
      prismaDocument.pageCount,
      prismaDocument.documentTitle,
      prismaDocument.documentAuthor,
      prismaDocument.language,
      prismaDocument.uploadedAt,
      prismaDocument.updatedAt,
    );
  }

  /**
   * construye la url del documento basada en la configuración de s3
   */
  private buildDocumentUrl(s3Key: string): string {
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const bucketName = process.env.MINIO_BUCKET_NAME || 'documents';
    return `${endpoint}/${bucketName}/${s3Key}`;
  }
}
