jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetCoursesByTeacherUseCase } from './get-courses-by-teacher.usecase';
import { COURSE_REPO, TEACHER_REPO } from '../../tokens';
import { NotFoundError } from '../../../../shared/handler/errors';

describe('GetCoursesByTeacherUseCase', () => {
  let useCase: GetCoursesByTeacherUseCase;
  let teacherRepo: { findByUserId: jest.Mock };
  let courseRepo: { findByTeacherId: jest.Mock };

  beforeEach(async () => {
    teacherRepo = { findByUserId: jest.fn() };
    courseRepo = { findByTeacherId: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCoursesByTeacherUseCase,
        { provide: TEACHER_REPO, useValue: teacherRepo },
        { provide: COURSE_REPO, useValue: courseRepo },
      ],
    }).compile();

    useCase = module.get(GetCoursesByTeacherUseCase);
  });

  it('should return courses for valid teacher', async () => {
    teacherRepo.findByUserId.mockResolvedValue({ id: 't1' });
    const mockCourses = [{ id: 'c1' }];
    courseRepo.findByTeacherId.mockResolvedValue(mockCourses);

    const result = await useCase.execute('t1');
    expect(result).toEqual(mockCourses);
  });

  it('should throw NotFoundError if teacher not found', async () => {
    teacherRepo.findByUserId.mockResolvedValue(null);
    await expect(useCase.execute('t1')).rejects.toThrow(NotFoundError);
  });
});
