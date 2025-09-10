import { Injectable } from '@nestjs/common';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';

export interface GetDocumentContentRequest {
  docId: string;
}

export interface GetDocumentContentResponse {
  contenido: string;
  metadata: {
    paginas?: number;
    resumen?: string;
  };
}

@Injectable()
export class GetDocumentContentUseCase {
  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
  ) {}

  async execute(
    request: GetDocumentContentRequest,
  ): Promise<GetDocumentContentResponse> {
    const { docId } = request;

    try {
      // Buscar el documento por ID
      const document = await this.documentRepository.findById(docId);

      if (!document) {
        throw new Error(`Documento con ID ${docId} no encontrado`);
      }

      // Verificar que el documento tenga texto extraído
      if (!document.extractedText) {
        throw new Error(
          `El documento ${docId} no tiene contenido de texto extraído`,
        );
      }

      // Construir la respuesta con el contenido y metadata
      const response: GetDocumentContentResponse = {
        contenido: document.extractedText,
        metadata: {
          paginas: document.pageCount || undefined,
          resumen: undefined, // Por ahora no generamos resúmenes automáticos
        },
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Error al obtener contenido del documento ${docId}: ${errorMessage}`,
      );
    }
  }
}
