import { Document } from '../entities/document.entity';
import {
  UploadDocumentRequest,
  DocumentListItem,
} from '../value-objects/upload-document.vo';

export interface DocumentStoragePort {
  uploadDocument(req: UploadDocumentRequest): Promise<Document>;
  generateDownloadUrl(fileName: string): Promise<string>;
  listDocuments(): Promise<DocumentListItem[]>;
  documentExists(fileName: string): Promise<boolean>;
  softDeleteDocument(fileName: string): Promise<void>;

  /**
   * Descarga el contenido de un archivo como Buffer
   * @param fileName Nombre del archivo o clave S3
   * @returns Buffer con el contenido del archivo
   */
  downloadFileBuffer(fileName: string): Promise<Buffer>;

  /**
   * verifica si un archivo existe en el storage
   * @param s3Key clave s3 del archivo
   * @returns true si el archivo existe
   */
  exists(s3Key: string): Promise<boolean>;

  /**
   * mueve un archivo de una ubicación a otra en el storage
   * @param sourceKey clave s3 de origen
   * @param destinationKey clave s3 de destino
   */
  moveFile(sourceKey: string, destinationKey: string): Promise<void>;
}
