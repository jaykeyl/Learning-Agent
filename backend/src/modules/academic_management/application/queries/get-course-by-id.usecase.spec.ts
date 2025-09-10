jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetCourseByIdUseCase } from './get-course-by-id.usecase';
import { COURSE_REPO } from '../../tokens';
import { NotFoundError } from '../../../../shared/handler/errors';

describe('GetCourseByIdUseCase', () => {
  let useCase: GetCourseByIdUseCase;
  let courseRepo: { findById: jest.Mock };

  beforeEach(async () => {
    courseRepo = { findById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCourseByIdUseCase,
        { provide: COURSE_REPO, useValue: courseRepo },
      ],
    }).compile();

    useCase = module.get(GetCourseByIdUseCase);
  });

  it('should return course if active', async () => {
    const mockCourse = { id: '1', isActive: true };
    courseRepo.findById.mockResolvedValue(mockCourse);
    const result = await useCase.execute('1');
    expect(result).toEqual(mockCourse);
  });

  it('should return null if course inactive', async () => {
    const mockCourse = { id: '1', isActive: false };
    courseRepo.findById.mockResolvedValue(mockCourse);
    const result = await useCase.execute('1');
    expect(result).toBeNull();
  });

  it('should throw NotFoundError if course not found', async () => {
    courseRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('1')).rejects.toThrow(NotFoundError);
  });
});
