import { UpdateClassUseCase } from './update-class.usecase';
import { NotFoundError, ForbiddenError } from '../../../../shared/handler/errors';
import { Logger } from '@nestjs/common/services/logger.service';

describe('UpdateClassUseCase', () => {
  let useCase: UpdateClassUseCase;
  let classRepo: any;
  let courseRepo: any;

  beforeEach(() => {
    classRepo = { findById: jest.fn(), updateInfo: jest.fn() };
    courseRepo = { findById: jest.fn() };

    useCase = new UpdateClassUseCase(classRepo, courseRepo);
      // Silenciar logs de errores en consola
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // Si usas Logger de NestJS:
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should throw NotFoundError if class not found', async () => {
    classRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        teacherId: 't1',
        classId: 'c1',
        name: 'X',
        semester: '2025-1',
        dateBegin: new Date(),
        dateEnd: new Date(),
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ForbiddenError if teacherId does not match course teacherId', async () => {
    classRepo.findById.mockResolvedValue({ id: 'c1', courseId: 'course1' });
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't2' });

    await expect(
      useCase.execute({
        teacherId: 't1',
        classId: 'c1',
        name: 'X',
        semester: '2025-1',
        dateBegin: new Date(),
        dateEnd: new Date(),
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should update class successfully', async () => {
    const input = {
      teacherId: 't1',
      classId: 'c1',
      name: 'Math',
      semester: '2025-1',
      dateBegin: new Date('2025-01-01'),
      dateEnd: new Date('2025-06-01'),
    };

    classRepo.findById.mockResolvedValue({ id: 'c1', courseId: 'course1' });
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't1', name: 'Algebra' });
    classRepo.updateInfo.mockResolvedValue({ id: 'c1', ...input });

    const result = await useCase.execute(input);

    expect(classRepo.updateInfo).toHaveBeenCalledWith(
      'c1',
      'Algebra-2025-1',
      '2025-1',
      input.dateBegin,
      input.dateEnd
    );
    expect(result.id).toBe('c1');
  });
});
