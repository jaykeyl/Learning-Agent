import { Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';

@Injectable()
export class DownloadDocumentUseCase {
  constructor(
    private readonly storageAdapter: DocumentStoragePort,
    private readonly documentRepository: DocumentRepositoryPort,
  ) {}

  /**
   * Genera una URL de descarga para el documento con el ID especificado.
   * Lanza NotFoundException si el documento no existe.
   */
  async execute(documentId: string): Promise<string> {
    // Buscar el documento por ID en la base de datos
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException(
        `Documento con ID "${documentId}" no encontrado`,
      );
    }

    // Validar existencia en el storage
    const exists = await this.storageAdapter.documentExists(document.fileName);
    if (!exists) {
      throw new NotFoundException(
        `Archivo del documento "${document.originalName}" no encontrado en el storage`,
      );
    }

    // Generar URL (presigned url u otra estrategia implementada por el adapter)
    const url = await this.storageAdapter.generateDownloadUrl(
      document.fileName,
    );

    if (!url) {
      // Caso improbable: adapter no devuelve URL
      throw new Error(
        `No se pudo generar la URL de descarga para el documento "${document.originalName}"`,
      );
    }

    return url;
  }
}