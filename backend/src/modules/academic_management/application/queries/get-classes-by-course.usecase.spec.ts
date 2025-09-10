jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetClassesByCourseUseCase } from './get-classes-by-course.usecase';
import { CLASSES_REPO, COURSE_REPO } from '../../tokens';
import { NotFoundError } from '../../../../shared/handler/errors';

describe('GetClassesByCourseUseCase', () => {
  let useCase: GetClassesByCourseUseCase;
  let classRepo: { findByCourseId: jest.Mock };
  let courseRepo: { findById: jest.Mock };

  beforeEach(async () => {
    classRepo = { findByCourseId: jest.fn() };
    courseRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetClassesByCourseUseCase,
        { provide: CLASSES_REPO, useValue: classRepo },
        { provide: COURSE_REPO, useValue: courseRepo },
      ],
    }).compile();

    useCase = module.get(GetClassesByCourseUseCase);
  });

  it('should return classes for a valid course', async () => {
    const mockCourse = { id: '1' };
    const mockClasses = [{ id: 'c1' }, { id: 'c2' }];
    courseRepo.findById.mockResolvedValue(mockCourse);
    classRepo.findByCourseId.mockResolvedValue(mockClasses);

    const result = await useCase.execute('1');
    expect(result).toEqual(mockClasses);
  });

  it('should throw NotFoundError if course not found', async () => {
    courseRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('1')).rejects.toThrow(NotFoundError);
  });
});
