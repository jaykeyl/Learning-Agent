import { SoftDeleteClassUseCase } from './soft-delete-class.usecase';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../../shared/handler/errors';
import { Logger } from '@nestjs/common/services/logger.service';

describe('SoftDeleteClassUseCase', () => {
  let useCase: SoftDeleteClassUseCase;
  let classRepo: any;
  let enrollmentRepo: any;
  let courseRepo: any;

  beforeEach(() => {
    classRepo = { findById: jest.fn(), softDelete: jest.fn() };
    enrollmentRepo = { findByClassId: jest.fn() };
    courseRepo = { findById: jest.fn() };

    useCase = new SoftDeleteClassUseCase(classRepo, enrollmentRepo, courseRepo);
    // Silenciar logs de errores en consola
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Si usas Logger de NestJS:
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should throw NotFoundError if class not found', async () => {
    classRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ teacherId: 't1', classId: 'c1' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ForbiddenError if teacherId does not match course teacherId', async () => {
    classRepo.findById.mockResolvedValue({ id: 'c1', courseId: 'course1', name: 'Math' });
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't2' });

    await expect(useCase.execute({ teacherId: 't1', classId: 'c1' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should throw ConflictError if active enrollments exist', async () => {
    classRepo.findById.mockResolvedValue({ id: 'c1', courseId: 'course1', name: 'Math' });
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't1' });
    enrollmentRepo.findByClassId.mockResolvedValue([{ isActive: true }]);

    await expect(useCase.execute({ teacherId: 't1', classId: 'c1' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('should soft delete class successfully', async () => {
    const fakeClass = { id: 'c1', name: 'Math', courseId: 'course1' };
    const deletedClass = { ...fakeClass, deletedAt: new Date() };

    classRepo.findById.mockResolvedValue(fakeClass);
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't1', name: 'Math' });
    enrollmentRepo.findByClassId.mockResolvedValue([]);
    classRepo.softDelete.mockResolvedValue(deletedClass);

    const result = await useCase.execute({ teacherId: 't1', classId: 'c1' });

    expect(result).toBe(deletedClass);
  });
});
