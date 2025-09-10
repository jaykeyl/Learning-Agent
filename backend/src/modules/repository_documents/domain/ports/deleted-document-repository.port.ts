import { Document } from '../entities/document.entity';

/**
 * puerto para manejar documentos eliminados
 */
export interface DeletedDocumentRepositoryPort {
  /**
   * busca un documento eliminado por su hash de archivo
   */
  findDeletedByFileHash(fileHash: string): Promise<Document | undefined>;

  /**
   * busca un documento eliminado por su hash de texto
   */
  findDeletedByTextHash(textHash: string): Promise<Document | undefined>;

  /**
   * busca documentos eliminados similares por hashes
   */
  findSimilarDeletedDocuments(
    fileHash?: string,
    textHash?: string,
  ): Promise<Document[]>;

  /**
   * restaura un documento eliminado moviendo de status DELETED a UPLOADED
   */
  restoreDocument(documentId: string): Promise<Document | undefined>;

  /**
   * obtiene todos los documentos eliminados (paginado)
   */
  findAllDeleted(offset?: number, limit?: number): Promise<Document[]>;

  /**
   * cuenta los documentos eliminados
   */
  countDeleted(): Promise<number>;

  /**
   * elimina permanentemente un documento (hard delete)
   */
  permanentlyDelete(documentId: string): Promise<boolean>;
}
