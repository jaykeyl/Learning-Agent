/**
 * dto para la solicitud de verificación de documentos eliminados
 */
export class CheckDeletedDocumentRequestDto {
  skipTextExtraction?: boolean | string;
  autoRestore?: boolean | string;
}

/**
 * dto para la respuesta de verificación de documentos eliminados
 */
export class CheckDeletedDocumentResponseDto {
  constructor(
    public readonly status: 'exact_match' | 'text_match' | 'no_match' | 'restored',
    public readonly message: string,
    public readonly deletedDocument?: DeletedDocumentDto,
    public readonly restoredDocument?: RestoredDocumentDto,
  ) {}
}

/**
 * dto para representar un documento eliminado encontrado
 */
export class DeletedDocumentDto {
  constructor(
    public readonly id: string,
    public readonly originalName: string,
    public readonly documentTitle: string | null,
    public readonly documentAuthor: string | null,
    public readonly uploadedAt: Date,
    public readonly uploadedBy: string,
    public readonly deletedAt: Date,
    public readonly matchType: 'binary_hash' | 'text_hash',
    public readonly size: number,
    public readonly pageCount?: number,
  ) {}
}

/**
 * dto para representar un documento restaurado
 */
export class RestoredDocumentDto {
  constructor(
    public readonly id: string,
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly downloadUrl: string,
    public readonly restoredAt: Date,
  ) {}
}

/**
 * dto para la solicitud de restauración manual de un documento
 */
export class RestoreDocumentRequestDto {
  constructor(public readonly documentId: string) {}
}

/**
 * dto para la respuesta de restauración de documento
 */
export class RestoreDocumentResponseDto {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly restoredDocument?: RestoredDocumentDto,
  ) {}
}
