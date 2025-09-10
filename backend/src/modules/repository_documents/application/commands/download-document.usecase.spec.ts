import { DownloadDocumentUseCase } from './download-document.usecase';
import { Logger, NotFoundException } from '@nestjs/common';

describe('DownloadDocumentUseCase', () => {
  let useCase: DownloadDocumentUseCase;
  let storageMock: any;
  let repoMock: any;

  beforeEach(() => {
    storageMock = {
      documentExists: jest.fn(),
      generateDownloadUrl: jest.fn(),
    };
    repoMock = {
      findById: jest.fn(),
    };

    useCase = new DownloadDocumentUseCase(storageMock, repoMock);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should return download url', async () => {
    const document = { fileName: 'file.pdf', originalName: 'File.pdf' };
    repoMock.findById.mockResolvedValue(document);
    storageMock.documentExists.mockResolvedValue(true);
    storageMock.generateDownloadUrl.mockResolvedValue('http://url');

    const url = await useCase.execute('doc-1');
    expect(url).toBe('http://url');
  });

  it('should throw NotFoundException if document not found', async () => {
    repoMock.findById.mockResolvedValue(null);
    await expect(useCase.execute('doc-1')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if file not in storage', async () => {
    const document = { fileName: 'file.pdf', originalName: 'File.pdf' };
    repoMock.findById.mockResolvedValue(document);
    storageMock.documentExists.mockResolvedValue(false);

    await expect(useCase.execute('doc-1')).rejects.toThrow(NotFoundException);
  });
});
