import { UploadDocumentUseCase } from './upload-document.usecase';
import { Logger, BadRequestException } from '@nestjs/common';

describe('UploadDocumentUseCase', () => {
  let useCase: UploadDocumentUseCase;
  let storageMock: any;
  let repoMock: any;

  beforeEach(() => {
    storageMock = { uploadDocument: jest.fn() };
    repoMock = { findByFileHash: jest.fn(), save: jest.fn() };

    useCase = new UploadDocumentUseCase(storageMock, repoMock);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  it('should upload document successfully', async () => {
    const file: any = { originalname: 'file.pdf', mimetype: 'application/pdf', size: 100, buffer: Buffer.from('data') };
    repoMock.findByFileHash.mockResolvedValue(null);
    storageMock.uploadDocument.mockResolvedValue({ fileName: 'file.pdf', url: 'http://url' });
    repoMock.save.mockImplementation(d => Promise.resolve(d));

    const doc = await useCase.execute(file, 'user-1');
    expect(doc.originalName).toBe('file.pdf');
  });

  it('should throw BadRequestException if file not PDF', async () => {
    const file: any = { originalname: 'file.txt', mimetype: 'text/plain', size: 100, buffer: Buffer.from('data') };
    await expect(useCase.execute(file, 'user-1')).rejects.toThrow(BadRequestException);
  });
});
