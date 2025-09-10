import { Injectable } from '@nestjs/common';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';

export interface AssociateDocumentToCourseRequest {
  documentId: string;
  courseId: string;
}

export interface AssociateDocumentToCourseResponse {
  success: boolean;
  message: string;
  documentId: string;
  courseId: string;
}

@Injectable()
export class AssociateDocumentToCourseUseCase {
  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
  ) {}

  async execute(
    request: AssociateDocumentToCourseRequest,
  ): Promise<AssociateDocumentToCourseResponse> {
    const { documentId, courseId } = request;

    try {
      // Verificar que el documento existe
      const document = await this.documentRepository.findById(documentId);
      if (!document) {
        return {
          success: false,
          message: `Documento con ID ${documentId} no encontrado`,
          documentId,
          courseId,
        };
      }

      // Asociar el documento con el curso
      await this.documentRepository.associateWithCourse(documentId, courseId);

      return {
        success: true,
        message: 'Documento asociado exitosamente con el curso',
        documentId,
        courseId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: `Error al asociar documento con curso: ${errorMessage}`,
        documentId,
        courseId,
      };
    }
  }
}
