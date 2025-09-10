jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetClassesByStudentUseCase } from './get-classes-by-student.usecase';
import { ENROLLMENT_REPO, CLASSES_REPO, STUDENT_REPO } from '../../tokens';
import { NotFoundError } from '../../../../shared/handler/errors';

describe('GetClassesByStudentUseCase', () => {
  let useCase: GetClassesByStudentUseCase;
  let studentRepo: { findByUserId: jest.Mock };
  let enrollmentRepo: { findByStudentId: jest.Mock };
  let classesRepo: { findById: jest.Mock };

  beforeEach(async () => {
    studentRepo = { findByUserId: jest.fn() };
    enrollmentRepo = { findByStudentId: jest.fn() };
    classesRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetClassesByStudentUseCase,
        { provide: STUDENT_REPO, useValue: studentRepo },
        { provide: ENROLLMENT_REPO, useValue: enrollmentRepo },
        { provide: CLASSES_REPO, useValue: classesRepo },
      ],
    }).compile();

    useCase = module.get(GetClassesByStudentUseCase);
  });

  it('should return active classes for a student', async () => {
    studentRepo.findByUserId.mockResolvedValue({ id: 's1' });
    enrollmentRepo.findByStudentId.mockResolvedValue([{ classId: 'c1' }, { classId: 'c2' }]);
    classesRepo.findById.mockImplementation(id => Promise.resolve({ id, isActive: id === 'c1' }));

    const result = await useCase.execute('s1');
    expect(result).toEqual([{ id: 'c1', isActive: true }]);
  });

  it('should throw NotFoundError if student not found', async () => {
    studentRepo.findByUserId.mockResolvedValue(null);
    await expect(useCase.execute('s1')).rejects.toThrow(NotFoundError);
  });
});
