import { DeleteDocumentUseCase } from './delete-document.usecase';
import { Logger } from '@nestjs/common';

describe('DeleteDocumentUseCase', () => {
  let useCase: DeleteDocumentUseCase;
  let storageMock: any;
  let repoMock: any;

  beforeEach(() => {
    storageMock = {
      documentExists: jest.fn(),
      softDeleteDocument: jest.fn(),
    };
    repoMock = {
      findById: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new DeleteDocumentUseCase(storageMock, repoMock);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should delete document successfully', async () => {
    const document = { fileName: 'file.pdf', originalName: 'File.pdf' };
    repoMock.findById.mockResolvedValue(document);
    storageMock.documentExists.mockResolvedValue(true);

    const result = await useCase.execute('doc-1');

    expect(storageMock.softDeleteDocument).toHaveBeenCalledWith('file.pdf');
    expect(repoMock.delete).toHaveBeenCalledWith('doc-1');
    expect(result.success).toBe(true);
  });

  it('should return error if document not found', async () => {
    repoMock.findById.mockResolvedValue(null);

    const result = await useCase.execute('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DOCUMENT_NOT_FOUND');
  });

  it('should return error if file not found in storage', async () => {
    repoMock.findById.mockResolvedValue({ fileName: 'file.pdf', originalName: 'File.pdf' });
    storageMock.documentExists.mockResolvedValue(false);

    const result = await useCase.execute('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DOCUMENT_NOT_FOUND');
  });
});
