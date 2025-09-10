import { Injectable } from '@nestjs/common';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import type { DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { ContractDocumentListItem } from '../../domain/entities/contract-document-list-item';

export interface GetDocumentsBySubjectRequest {
  materiaId: string;
  tipo?: string;
  page?: number;
  limit?: number;
}

export interface GetDocumentsBySubjectResponse {
  docs: ContractDocumentListItem[];
  total: number;
  page: number;
}

@Injectable()
export class GetDocumentsBySubjectUseCase {
  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly documentStorage: DocumentStoragePort,
  ) {}

  async execute(
    request: GetDocumentsBySubjectRequest,
  ): Promise<GetDocumentsBySubjectResponse> {
    const { materiaId, tipo, page = 1, limit = 10 } = request;

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    try {
      // Obtener documentos de la base de datos filtrados por curso
      const dbDocuments = await this.documentRepository.findByCourseId(
        materiaId,
        offset,
        limit,
        tipo,
      );

      // Obtener el total de documentos para la materia
      const total = await this.documentRepository.countByCourseId(
        materiaId,
        tipo,
      );

      // Crear ContractDocumentListItem con datos correctos
      const documents: ContractDocumentListItem[] = [];

      for (const doc of dbDocuments) {
        try {
          // Verificar que el archivo existe en el storage
          const exists = await this.documentStorage.documentExists(
            doc.fileName,
          );
          if (!exists) continue;

          // Generar URL de descarga
          const downloadUrl = await this.documentStorage.generateDownloadUrl(
            doc.fileName,
          );

          documents.push(
            new ContractDocumentListItem(
              doc.id,
              doc.fileName,
              doc.originalName,
              doc.mimeType,
              doc.size,
              downloadUrl,
              doc.uploadedAt,
              doc.uploadedBy,
            ),
          );
        } catch (error) {
          // Si hay error con un documento específico, lo omitimos pero continuamos
          console.warn(
            `Error processing document ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          continue;
        }
      }

      return {
        docs: documents,
        total,
        page,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Error al obtener documentos de la materia ${materiaId}: ${errorMessage}`,
      );
    }
  }
}
