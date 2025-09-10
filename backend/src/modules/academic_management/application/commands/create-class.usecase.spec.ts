// MOCKEAR ERRORES ANTES DE IMPORTAR EL USE CASE
jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { CreateClassUseCase } from './create-class.usecase';
import { NotFoundError, ForbiddenError } from '../../../../shared/handler/errors';
import { Classes } from '../../domain/entities/classes.entity';
import { Logger } from '@nestjs/common/services/logger.service';

describe('CreateClassUseCase', () => {
  let useCase: CreateClassUseCase;
  let teacherRepo: any;
  let courseRepo: any;
  let classRepo: any;

  beforeEach(() => {
    teacherRepo = { findByUserId: jest.fn() };
    courseRepo = { findById: jest.fn() };
    classRepo = { create: jest.fn() };

    useCase = new CreateClassUseCase(teacherRepo, classRepo, courseRepo);

    // Silenciar logs de errores en consola
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Si usas Logger de NestJS:
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should create a class when teacher and course exist and match', async () => {
    const teacher = { userId: 't1' };
    const course = { id: 'c1', name: 'Math', teacherId: 't1' };
    const input = {
      teacherId: 't1',
      courseId: 'c1',
      semester: '2025-1',
      dateBegin: new Date('2025-01-01'),
      dateEnd: new Date('2025-06-01'),
    };
    const expectedClass = {
      id: 'class-1',
      name: 'Math-2025-1',
      semester: '2025-1',
      courseId: 'c1',
      dateBegin: new Date('2025-01-01'),
      dateEnd: new Date('2025-06-01'),
    } as unknown as Classes;

    teacherRepo.findByUserId.mockResolvedValue(teacher);
    courseRepo.findById.mockResolvedValue(course);
    classRepo.create.mockResolvedValue(expectedClass);

    const result = await useCase.execute(input);

    expect(teacherRepo.findByUserId).toHaveBeenCalledWith('t1');
    expect(courseRepo.findById).toHaveBeenCalledWith('c1');
    expect(classRepo.create).toHaveBeenCalledWith(
      'Math-2025-1',
      '2025-1',
      'c1',
      input.dateBegin,
      input.dateEnd
    );
    expect(result).toBe(expectedClass);
  });

  it('should throw NotFoundError if teacher is not found', async () => {
    teacherRepo.findByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        teacherId: 't1',
        courseId: 'c1',
        semester: '2025-1',
        dateBegin: new Date(),
        dateEnd: new Date(),
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw NotFoundError if course is not found', async () => {
    teacherRepo.findByUserId.mockResolvedValue({ userId: 't1' });
    courseRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        teacherId: 't1',
        courseId: 'c1',
        semester: '2025-1',
        dateBegin: new Date(),
        dateEnd: new Date(),
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should throw ForbiddenError if course does not belong to teacher', async () => {
    teacherRepo.findByUserId.mockResolvedValue({ userId: 't1' });
    courseRepo.findById.mockResolvedValue({ id: 'c1', name: 'Math', teacherId: 't2' });

    await expect(
      useCase.execute({
        teacherId: 't1',
        courseId: 'c1',
        semester: '2025-1',
        dateBegin: new Date(),
        dateEnd: new Date(),
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
