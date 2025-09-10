import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { Document } from '../../domain/entities/document.entity';
import {
  UploadDocumentRequest,
  DocumentListItem,
} from '../../domain/value-objects/upload-document.vo';
import { minioConfig } from '../config/minio.config';
import { Console } from 'console';

@Injectable()
export class S3StorageAdapter implements DocumentStoragePort {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor() {
    this.s3Client = new S3Client({
      region: minioConfig.region,
      endpoint: minioConfig.endpoint,
      credentials: {
        accessKeyId: minioConfig.accessKeyId,
        secretAccessKey: minioConfig.secretAccessKey,
      },
      forcePathStyle: true, // Necesario para MinIO
    });

    this.bucketName = minioConfig.bucketName;
    this.endpoint = minioConfig.endpoint;
  }

  /**
   * Sube un documento a MinIO
   * @param req - Datos del documento a subir
   * @returns Documento creado con metadata
   */
  async uploadDocument(req: UploadDocumentRequest): Promise<Document> {
    try {
      console.log(' MinIO Config:', {
        endpoint: this.endpoint,
        bucketName: this.bucketName,
        region: minioConfig.region,
      });
      console.log(' Upload Request:', {
        originalName: req.originalName,
        mimeType: req.mimeType,
        size: req.size,
      });
      
      // Generar nombre único para el archivo
      const fileName = this.generateFileName(req.originalName);

      // Configurar comando de subida
      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: req.file,
        ContentType: req.mimeType,
        ContentLength: req.size,
        Metadata: {
          originalName: req.originalName,
          uploadDate: new Date().toISOString(),
        },
      });
      // Subir archivo a MinIO
      await this.s3Client.send(putObjectCommand);
      const url = `${this.endpoint}/${this.bucketName}/${fileName}`;
      console.log(`Documento subido exitosamente a ${url}`);
      // Crear entidad Document (versión simple para compatibilidad)
      const document = new Document(
        '', // id - será asignado por el caso de uso
        fileName,
        req.originalName,
        req.mimeType,
        req.size,
        url,
        fileName, // s3Key
        '', // fileHash - será asignado por el caso de uso
        '', // uploadedBy - será asignado por el caso de uso
      );

      return document;
    } catch (error) {
      throw new Error(`Error uploading document to MinIO: ${error.message || error}`);
    }
  }

  /**
   * Genera una URL firmada para descargar un documento
   * @param fileName - Nombre del archivo en MinIO
   * @returns URL firmada válida por 1 hora
   */
  async generateDownloadUrl(fileName: string): Promise<string> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      // Generar URL firmada válida por 1 hora
      const signedUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
        expiresIn: 3600,
      });

      return signedUrl;
    } catch (error) {
      throw new Error(`Error generating download URL: ${error.message || error}`);
    }
  }

  /**
   * Lista todos los documentos almacenados en MinIO
   * @returns Array de documentos con metadata básica
   */
  async listDocuments(): Promise<DocumentListItem[]> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });

      const response = await this.s3Client.send(listCommand);
      if (!response.Contents || response.Contents.length === 0) {
        return [];
      }

      // Mapear objetos S3 a DocumentListItem
      const documents: DocumentListItem[] = [];

      for (const object of response.Contents) {
        if (!object.Key) continue;
        if (!object.Key.toLowerCase().endsWith('.pdf')) continue; // Filtrar solo PDFs

        try {
          const metadata = await this.s3Client.send(
            new HeadObjectCommand({
              Bucket: this.bucketName,
              Key: object.Key,
            }),
          );

          if (metadata.ContentType !== 'application/pdf') continue; // MIME PDF

          const downloadUrl = await this.generateDownloadUrl(object.Key);

          // Extraer el nombre original usando el parser de nombres o los metadatos
          const parsedInfo = this.parseFileName(object.Key);
          const originalName =
            metadata.Metadata?.originalName ||
            parsedInfo?.originalName ||
            object.Key;

          documents.push(
            new DocumentListItem(
              object.Key, // Usar el fileName como id temporalmente
              object.Key,
              originalName,
              metadata.ContentType || 'application/pdf',
              metadata.ContentLength || 0,
              downloadUrl,
              metadata.LastModified || new Date(),
            ),
          );
        } catch {
          console.error(`Error fetching metadata for ${object.Key}`);
        }
      }

      return documents;
    } catch {
      throw new Error('Error listing documents from MinIO');
    }
  }

  /**
   * Genera un nombre único para el archivo combinando timestamp, UUID y nombre original
   * @param originalFileName - Nombre original del archivo
   * @returns Nombre único para MinIO con formato: timestamp_uuid_nombreOriginal.pdf
   */
  private generateFileName(originalFileName: string): string {
    const timestamp = Date.now();
    const uniqueId = randomUUID();

    // Extraer la extensión del archivo
    const extension = originalFileName.split('.').pop()?.toLowerCase() || 'pdf';

    // Sanitizar el nombre original
    const baseName = originalFileName
      .replace(/\.[^/.]+$/, '') // Remover extensión
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplazar caracteres especiales
      .substring(0, 50); // Limitar longitud

    // Generar nombre único: timestamp_uuid_nombreOriginal.extension (SIN carpeta)
    const uniqueFileName = `${timestamp}_${uniqueId}_${baseName}.${extension}`;

    return uniqueFileName; // Directamente en el bucket root
  }

  /**
   * Extrae información del nombre de archivo generado
   * @param fileName - Nombre del archivo generado (ej: 1234567890_uuid_documento.pdf)
   * @returns Objeto con timestamp, uuid, nombre original y extensión
   */
  private parseFileName(fileName: string): {
    timestamp: number;
    uuid: string;
    originalName: string;
    extension: string;
  } | null {
    try {
      // Sin carpeta documents/, buscar directamente el patrón
      const match = fileName.match(/^(\d+)_([a-f0-9-]+)_(.+)\.([^.]+)$/);

      if (!match) {
        return null;
      }

      const [, timestampStr, uuid, originalName, extension] = match;

      return {
        timestamp: parseInt(timestampStr, 10),
        uuid,
        originalName: originalName.replace(/_/g, ' '),
        extension,
      };
    } catch {
      return null;
    }
  }

  /**
   * Verifica si un archivo existe en MinIO
   * @param fileName - Nombre del archivo a verificar
   * @returns true si existe, false si no
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(headCommand);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica si un documento existe en MinIO
   * @param fileName - Nombre del archivo a verificar
   * @returns true si el archivo existe, false en caso contrario
   */
  async documentExists(fileName: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(headCommand);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Realiza un soft delete moviendo el archivo a la carpeta deleted/
   * @param fileName - Nombre del archivo a mover
   */
  async softDeleteDocument(fileName: string): Promise<void> {
    try {
      const deletedFileName = `deleted/${fileName}`;

      // Copiar el archivo a la carpeta deleted/
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${fileName}`,
        Key: deletedFileName,
      });

      await this.s3Client.send(copyCommand);

      // Eliminar el archivo original
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(deleteCommand);
    } catch {
      throw new Error('Error performing soft delete');
    }
  }

  /**
   * Elimina un archivo de MinIO
   * @param fileName - Nombre del archivo a eliminar
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(deleteCommand);
    } catch {
      throw new Error('Error deleting file from MinIO');
    }
  }

  /**
   * Descarga el contenido de un archivo como Buffer
   * @param fileName Nombre del archivo o clave S3
   * @returns Buffer con el contenido del archivo
   */
  async downloadFileBuffer(fileName: string): Promise<Buffer> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      const response = await this.s3Client.send(getObjectCommand);

      if (!response.Body) {
        throw new Error('File content is empty');
      }

      // Convertir stream a buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as any;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      throw new Error(`Error downloading file from MinIO: ${error.message}`);
    }
  }

  /**
   * verifica si un archivo existe en el storage
   * @param s3Key clave s3 del archivo
   * @returns true si el archivo existe
   */
  async exists(s3Key: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(headCommand);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * mueve un archivo de una ubicación a otra en el storage
   * @param sourceKey clave s3 de origen
   * @param destinationKey clave s3 de destino
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      // copiar archivo a la nueva ubicación
      const copyCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(copyCommand);

      // eliminar archivo original
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: sourceKey,
      });

      await this.s3Client.send(deleteCommand);
    } catch (error) {
      throw new Error(
        `error moviendo archivo de ${sourceKey} a ${destinationKey}: ${error.message}`,
      );
    }
  }
}
