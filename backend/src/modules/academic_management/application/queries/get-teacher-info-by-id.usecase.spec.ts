jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetTeacherInfoByIDUseCase } from './get-teacher-info-by-id.usecase';
import { TEACHER_REPO, USER_REPO } from '../../tokens';
import { NotFoundError } from '../../../../shared/handler/errors';

describe('GetTeacherInfoByIDUseCase', () => {
  let useCase: GetTeacherInfoByIDUseCase;
  let teacherRepo: { findByUserId: jest.Mock };
  let userRepo: { findById: jest.Mock };

  beforeEach(async () => {
    teacherRepo = { findByUserId: jest.fn() };
    userRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTeacherInfoByIDUseCase,
        { provide: TEACHER_REPO, useValue: teacherRepo },
        { provide: USER_REPO, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get(GetTeacherInfoByIDUseCase);
  });

  it('should return teacher info', async () => {
    teacherRepo.findByUserId.mockResolvedValue({ userId: 'u1', academicUnit: 'CS', title: 'Dr', bio: 'Bio' });
    userRepo.findById.mockResolvedValue({ id: 'u1', name: 'John', lastname: 'Doe', email: 'a@b.com', isActive: true });

    const result = await useCase.execute('t1');
    expect(result.name).toBe('John');
  });

  it('should throw NotFoundError if teacher not found', async () => {
    teacherRepo.findByUserId.mockResolvedValue(null);
    await expect(useCase.execute('t1')).rejects.toThrow(NotFoundError);
  });
});
