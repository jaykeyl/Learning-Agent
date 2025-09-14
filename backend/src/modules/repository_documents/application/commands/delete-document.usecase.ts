import { Injectable, Logger } from '@nestjs/common';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import { DocumentStatus } from '../../domain/entities/document.entity';

@Injectable()
export class DeleteDocumentUseCase {
  private readonly logger = new Logger(DeleteDocumentUseCase.name);

  constructor(
    private readonly storageAdapter: DocumentStoragePort,
    private readonly documentRepository: DocumentRepositoryPort,
  ) {}

  async execute(documentId: string): Promise<{
    success: boolean;
    message: string;
    deletedAt?: string;
    error?: string;
  }> {
    try {
      this.logger.log(`Iniciando eliminación de documento: ${documentId}`);

      // Buscar el documento por ID en la base de datos
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        this.logger.warn(`Documento no encontrado: ${documentId}`);
        return {
          success: false,
          message: `Document with ID '${documentId}' not found`,
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      this.logger.log(
        `Documento encontrado: ${document.originalName}, Status actual: ${document.status}, Hash: ${document.fileHash}`,
      );

      // Validar que el archivo existe en el storage antes de borrarlo
      const exists = await this.storageAdapter.documentExists(
        document.fileName,
      );
      if (!exists) {
        this.logger.warn(
          `Archivo no encontrado en storage: ${document.fileName}`,
        );
        return {
          success: false,
          message: `Document file '${document.fileName}' not found in storage`,
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      this.logger.log(`Archivo existe en storage: ${document.fileName}`);

      // Realizar el soft delete en el storage
      this.logger.log(`Iniciando soft delete en storage...`);
      await this.storageAdapter.softDeleteDocument(document.fileName);
      this.logger.log(`Soft delete en storage completado`);

      this.logger.log(`Eliminando registro en base de datos...`);
      await this.documentRepository.delete(documentId);

      this.logger.log(
        `Eliminación completada exitosamente: ${document.originalName}`,
      );

      return {
        success: true,
        message: `Document '${document.originalName}' deleted successfully`,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error eliminando documento ${documentId}:`, error);
      console.error('Error deleting document:', error);
      return {
        success: false,
        message: `Failed to delete document with ID '${documentId}'`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
