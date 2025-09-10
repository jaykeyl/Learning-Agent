export class ContractDocumentListItem {
  constructor(
    public readonly id: string,
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly downloadUrl: string,
    public readonly uploadedAt: Date,
    public readonly uploadedBy: string,
  ) {}
  toJSON() {
    return {
      id: this.id,
      fileName: this.fileName,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      downloadUrl: this.downloadUrl,
      uploadedAt: this.uploadedAt,
      uploadedBy: this.uploadedBy,
    };
  }
}
