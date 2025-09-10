jest.mock('../../../../shared/handler/errors', () => ({
  NotFoundError: class NotFoundError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { GetStudentsByClassUseCase } from './get-students-by-class.usecase';
import { ENROLLMENT_REPO, STUDENT_REPO, USER_REPO, CLASSES_REPO } from '../../tokens';
import { NotFoundError } from '../../../../shared/handler/errors';
import { UserInfoDTO } from '../../infrastructure/http/dtos/response.user-info.dto';

describe('GetStudentsByClassUseCase', () => {
  let useCase: GetStudentsByClassUseCase;
  let classesRepo: { findById: jest.Mock };
  let enrollmentRepo: { findByClassId: jest.Mock };
  let studentRepo: { findByUserId: jest.Mock };
  let userRepo: { findById: jest.Mock };

  beforeEach(async () => {
    classesRepo = { findById: jest.fn() };
    enrollmentRepo = { findByClassId: jest.fn() };
    studentRepo = { findByUserId: jest.fn() };
    userRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStudentsByClassUseCase,
        { provide: CLASSES_REPO, useValue: classesRepo },
        { provide: ENROLLMENT_REPO, useValue: enrollmentRepo },
        { provide: STUDENT_REPO, useValue: studentRepo },
        { provide: USER_REPO, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get(GetStudentsByClassUseCase);
  });

  it('should return students for a class', async () => {
    classesRepo.findById.mockResolvedValue({ id: 'c1' });
    enrollmentRepo.findByClassId.mockResolvedValue([{ studentId: 's1', isActive: true }]);
    studentRepo.findByUserId.mockResolvedValue({ userId: 'u1', code: '001', career: 'CS', admissionYear: 2020 });
    userRepo.findById.mockResolvedValue({ id: 'u1', name: 'John', lastname: 'Doe', email: 'a@b.com', isActive: true });

    const result = await useCase.execute('c1');
    expect(result[0]).toBeInstanceOf(UserInfoDTO);
    expect(result[0].name).toBe('John');
  });

  it('should throw NotFoundError if class not found', async () => {
    classesRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('c1')).rejects.toThrow(NotFoundError);
  });
});
