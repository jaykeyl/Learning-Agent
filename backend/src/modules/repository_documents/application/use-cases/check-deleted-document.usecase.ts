import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import type { DeletedDocumentRepositoryPort } from '../../domain/ports/deleted-document-repository.port';
import type { TextExtractionPort } from '../../domain/ports/text-extraction.port';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import {
  CheckDeletedDocumentRequest,
  DeletedDocumentCheckResult,
} from '../../domain/value-objects/deleted-document-check.vo';
import { DocumentStatus } from '../../domain/entities/document.entity';

@Injectable()
export class CheckDeletedDocumentUseCase {
  private readonly logger = new Logger(CheckDeletedDocumentUseCase.name);

  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly deletedDocumentRepository: DeletedDocumentRepositoryPort,
    private readonly textExtraction: TextExtractionPort,
    private readonly documentStorage: DocumentStoragePort,
  ) {}

  async execute(
    request: CheckDeletedDocumentRequest,
  ): Promise<DeletedDocumentCheckResult> {
    try {
      this.logger.log(
        `verificando documento eliminado reutilizable: ${request.originalName}`,
      );

      // paso 1: verificar hash binario exacto contra documentos eliminados
      const fileHash = this.generateFileHash(request.file);
      this.logger.log(`hash del archivo generado: ${fileHash}`);
      
      const exactDeletedMatch =
        await this.deletedDocumentRepository.findDeletedByFileHash(fileHash);

      if (exactDeletedMatch) {
        this.logger.log(
          `encontrado documento eliminado con hash exacto: ${exactDeletedMatch.id}`,
        );

        // si auto-restore está habilitado, restaurar automáticamente
        if (request.options?.autoRestore) {
          return await this.restoreDeletedDocument(
            exactDeletedMatch,
            request.uploadedBy,
          );
        }

        return DeletedDocumentCheckResult.exactMatch(exactDeletedMatch);
      } else {
        this.logger.log(`no encontrado documento eliminado con hash binario: ${fileHash}`);
      }

      // paso 2: verificar hash de texto si no se debe omitir extracción
      if (!request.options?.skipTextExtraction) {
        const extractedText = await this.textExtraction.extractTextFromPdf(
          request.file,
          request.originalName,
        );

        const textHash = this.generateTextHash(extractedText.content);
        const textDeletedMatch =
          await this.deletedDocumentRepository.findDeletedByTextHash(textHash);

        if (textDeletedMatch) {
          this.logger.log(
            `encontrado documento eliminado con hash de texto: ${textDeletedMatch.id}`,
          );

          // si auto-restore está habilitado, restaurar automáticamente
          if (request.options?.autoRestore) {
            return await this.restoreDeletedDocument(
              textDeletedMatch,
              request.uploadedBy,
            );
          }

          return DeletedDocumentCheckResult.textMatch(textDeletedMatch);
        }
      }

      // paso 3: no se encontraron documentos eliminados similares
      this.logger.log('no se encontraron documentos eliminados reutilizables');
      return DeletedDocumentCheckResult.noMatch();
    } catch (error) {
      this.logger.error(
        `error verificando documento eliminado: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * restaura un documento eliminado
   */
  async restoreDeletedDocument(
    deletedDocument: any,
    restoredBy: string,
  ): Promise<DeletedDocumentCheckResult> {
    try {
      this.logger.log(
        `iniciando restauración documento: ${deletedDocument.id}`,
      );
      this.logger.debug('documento a restaurar:', {
        id: deletedDocument.id,
        fileName: deletedDocument.fileName,
        s3Key: deletedDocument.s3Key,
        status: deletedDocument.status,
      });

      // paso 1: verificar que el archivo aún existe en la carpeta deleted del bucket
      const deletedS3Key = `deleted/${deletedDocument.fileName}`; // usar fileName en lugar de s3Key
      this.logger.log(
        `verificando existencia archivo eliminado: ${deletedS3Key}`,
      );
      
      const exists = await this.documentStorage.exists(deletedS3Key);

      if (!exists) {
        this.logger.error(
          `archivo eliminado no encontrado en storage: ${deletedS3Key}`,
        );
        throw new Error(
          `archivo eliminado no encontrado en storage: ${deletedS3Key}`,
        );
      }

      this.logger.log(`archivo eliminado encontrado, procediendo a mover`);

      // paso 2: mover archivo de deleted/ de vuelta a la ubicación original
      const originalS3Key = deletedDocument.fileName; // ubicación original es el fileName directamente
      this.logger.log(`moviendo archivo de ${deletedS3Key} a ${originalS3Key}`);
      
      await this.documentStorage.moveFile(deletedS3Key, originalS3Key);
      this.logger.log(`archivo movido exitosamente`);

      // paso 3: actualizar estado del documento a UPLOADED
      this.logger.log(
        `actualizando estado documento en BD: ${deletedDocument.id}`,
      );
      const restoredDocument =
        await this.deletedDocumentRepository.restoreDocument(
          deletedDocument.id,
        );

      if (!restoredDocument) {
        this.logger.error(
          `fallo actualizando estado documento: ${deletedDocument.id}`,
        );
        throw new Error(
          `no se pudo restaurar documento: ${deletedDocument.id}`,
        );
      }

      this.logger.log(
        `documento restaurado exitosamente: ${restoredDocument.id}`,
      );
      this.logger.debug(`documento restaurado:`, {
        id: restoredDocument.id,
        fileName: restoredDocument.fileName,
        status: restoredDocument.status,
      });

      return DeletedDocumentCheckResult.restored(
        deletedDocument,
        restoredDocument,
      );
    } catch (error) {
      this.logger.error(
        `error restaurando documento ${deletedDocument.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * genera hash sha-256 del contenido del archivo
   */
  private generateFileHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * genera hash del texto normalizado
   */
  private generateTextHash(text: string): string {
    // normalizar texto: minúsculas, quitar espacios extra y normalizar saltos de línea
    const normalizedText = text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim();

    return createHash('sha256').update(normalizedText, 'utf8').digest('hex');
  }

  /**
   * restaura un documento eliminado específico por su id
   */
  async restoreDocumentById(
    documentId: string,
    restoredBy: string,
  ): Promise<{ success: boolean; message?: string; document?: any }> {
    try {
      this.logger.log(`iniciando restauración manual documento: ${documentId}`);

      // buscar el documento eliminado usando el repositorio general 
      // (ya que tenemos documentos con status DELETED)
      const deletedDocument = await this.documentRepository.findById(documentId);

      if (!deletedDocument || deletedDocument.status !== DocumentStatus.DELETED) {
        this.logger.warn(`documento no encontrado o no está eliminado: ${documentId}`);
        return {
          success: false,
          message: 'documento no encontrado o no está eliminado',
        };
      }

      this.logger.log(`documento eliminado encontrado, iniciando restauración: ${documentId}`);

      // usar la lógica completa de restauración
      const result = await this.restoreDeletedDocument(deletedDocument, restoredBy);

      if (result.status === 'restored' && result.restoredDocument) {
        return {
          success: true,
          message: 'documento restaurado exitosamente',
          document: result.restoredDocument,
        };
      } else {
        return {
          success: false,
          message: 'error durante la restauración del documento',
        };
      }
    } catch (error) {
      this.logger.error(`error en restauración manual: ${error.message}`);
      return {
        success: false,
        message: `error durante la restauración: ${error.message}`,
      };
    }
  }
}
