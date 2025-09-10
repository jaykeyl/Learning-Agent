import { SoftDeleteSingleEnrollmentUseCase } from './soft-delete-single-enrollment.useCase';
import { NotFoundError, ForbiddenError } from '../../../../shared/handler/errors';
import { Logger } from '@nestjs/common/services/logger.service';

describe('SoftDeleteSingleEnrollmentUseCase', () => {
  let useCase: SoftDeleteSingleEnrollmentUseCase;
  let enrollmentRepo: any;
  let courseRepo: any;
  let classRepo: any;

  beforeEach(() => {
    enrollmentRepo = { findByStudentAndClass: jest.fn(), softDelete: jest.fn() };
    courseRepo = { findById: jest.fn() };
    classRepo = { findById: jest.fn() };

    useCase = new SoftDeleteSingleEnrollmentUseCase(enrollmentRepo, courseRepo, classRepo);
    // Silenciar logs de errores en consola
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Si usas Logger de NestJS:
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
  });

  it('should throw NotFoundError if enrollment not found', async () => {
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentId: 's1', classId: 'c1', teacherId: 't1' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ForbiddenError if teacher does not own course', async () => {
    enrollmentRepo.findByStudentAndClass.mockResolvedValue({ studentId: 's1', classId: 'c1' });
    classRepo.findById.mockResolvedValue({ id: 'c1', courseId: 'course1' });
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't2' });

    await expect(
      useCase.execute({ studentId: 's1', classId: 'c1', teacherId: 't1' })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should soft delete enrollment successfully', async () => {
    const fakeEnrollment = { studentId: 's1', classId: 'c1' };
    const deletedEnrollment = { ...fakeEnrollment, deletedAt: new Date() };

    enrollmentRepo.findByStudentAndClass.mockResolvedValue(fakeEnrollment);
    classRepo.findById.mockResolvedValue({ id: 'c1', courseId: 'course1' });
    courseRepo.findById.mockResolvedValue({ id: 'course1', teacherId: 't1' });
    enrollmentRepo.softDelete.mockResolvedValue(deletedEnrollment);

    const result = await useCase.execute({ studentId: 's1', classId: 'c1', teacherId: 't1' });

    expect(result).toBe(deletedEnrollment);
  });
});
