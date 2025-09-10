import { ProcessDocumentTextUseCase } from './process-document-text.usecase';
import { Logger } from '@nestjs/common';

describe('ProcessDocumentTextUseCase', () => {
  let useCase: ProcessDocumentTextUseCase;
  let repoMock: any;
  let textExtractionMock: any;
  let storageMock: any;

  beforeEach(() => {
    repoMock = { findById: jest.fn(), updateStatus: jest.fn(), updateExtractedText: jest.fn() };
    textExtractionMock = { extractTextFromPdf: jest.fn() };
    storageMock = { downloadFileBuffer: jest.fn() };

    useCase = new ProcessDocumentTextUseCase(repoMock, textExtractionMock, storageMock);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  it('should process text successfully', async () => {
    const doc: any = { isReadyForProcessing: () => true, s3Key: 'file.pdf', originalName: 'File.pdf' };
    repoMock.findById.mockResolvedValue(doc);
    storageMock.downloadFileBuffer.mockResolvedValue(Buffer.from('data'));
    textExtractionMock.extractTextFromPdf.mockResolvedValue({
      content: 'extracted',
      pageCount: 1,
      documentTitle: 'Title',
      documentAuthor: 'Author',
      language: 'en',
      getContentLength: () => 9,
      getWordCount: () => 1,
    });

    const result = await useCase.execute('doc-1');
    expect(result).toBe(true);
  });

  it('should return false if document not ready', async () => {
    const doc: any = { isReadyForProcessing: () => false };
    repoMock.findById.mockResolvedValue(doc);

    const result = await useCase.execute('doc-1');
    expect(result).toBe(false);
  });
});
