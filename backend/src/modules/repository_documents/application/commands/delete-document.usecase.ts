import { Injectable } from '@nestjs/common';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';

@Injectable()
export class DeleteDocumentUseCase {
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
      // Buscar el documento por ID en la base de datos
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: `Document with ID '${documentId}' not found`,
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      // Validar que el archivo existe en el storage antes de borrarlo
      const exists = await this.storageAdapter.documentExists(
        document.fileName,
      );
      if (!exists) {
        return {
          success: false,
          message: `Document file '${document.fileName}' not found in storage`,
          error: 'DOCUMENT_NOT_FOUND',
        };
      }

      // Realizar el soft delete en el storage
      await this.storageAdapter.softDeleteDocument(document.fileName);

      // Eliminar el documento de la base de datos
      await this.documentRepository.delete(documentId);

      return {
        success: true,
        message: `Document '${document.originalName}' deleted successfully`,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        message: `Failed to delete document with ID '${documentId}'`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}