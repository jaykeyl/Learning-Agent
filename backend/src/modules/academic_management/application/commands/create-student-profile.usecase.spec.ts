jest.mock('../../../identity/infrastructure/crypto/bcrypt.hasher', () => ({
  BcryptHasher: class BcryptHasher {
    async hash(value: string) {
      return `mock-hash(${value})`;
    }
  },
}));

jest.mock('../../../../shared/handler/errors', () => ({
  InternalServerError: class InternalServerError extends Error {},
}));

import { CreateStudentProfileUseCase } from './create-student-profile.usecase';
import { InternalServerError } from '../../../../shared/handler/errors';
import { Student } from '../../domain/entities/student.entity';
import { Logger } from '@nestjs/common/services/logger.service';

describe('CreateStudentProfileUseCase', () => {
  let useCase: CreateStudentProfileUseCase;
  let userRepo: any;
  let studentRepo: any;
  let roleRepo: any;
  let hasher: any;

  beforeEach(() => {
    userRepo = { create: jest.fn() };
    studentRepo = { create: jest.fn() };
    roleRepo = { findByName: jest.fn() };
    hasher = new (require('../../../identity/infrastructure/crypto/bcrypt.hasher').BcryptHasher)();

    useCase = new CreateStudentProfileUseCase(userRepo, studentRepo, roleRepo, hasher);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should create student profile successfully', async () => {
    const input = { studentName: 'John', studentLastname: 'Doe', studentCode: 'S001' };

    const role = { id: 'role1', name: 'estudiante' };
    const createdUser = { id: 'user1' };
    const createdStudent: Student = { userId: 'user1', code: 's001' } as Student;

    roleRepo.findByName.mockResolvedValue(role);
    userRepo.create.mockResolvedValue(createdUser);
    studentRepo.create.mockResolvedValue(createdStudent);

    const result = await useCase.execute(input);

    // fixedString hace lowercase: "DoeS001" -> "does001"
    expect(userRepo.create).toHaveBeenCalledWith(
      'John',
      'Doe',
      'johndoes001@upb.edu',
      'mock-hash(does001UPB2025)',
      true,
      'role1',
    );

    expect(studentRepo.create).toHaveBeenCalledWith('user1', 'S001');
    expect(result).toBe(createdStudent);
  });

  it('should throw InternalServerError if role not found', async () => {
    roleRepo.findByName.mockResolvedValue(null);

    await expect(useCase.execute({ studentName: 'Jane', studentLastname: 'Smith', studentCode: 'S002' }))
      .rejects.toBeInstanceOf(InternalServerError);
  });

  it('should throw InternalServerError if user creation fails', async () => {
    roleRepo.findByName.mockResolvedValue({ id: 'role1', name: 'estudiante' });
    userRepo.create.mockResolvedValue(null);

    await expect(useCase.execute({ studentName: 'Jane', studentLastname: 'Smith', studentCode: 'S002' }))
      .rejects.toBeInstanceOf(InternalServerError);
  });

  it('should throw InternalServerError if student creation fails', async () => {
    roleRepo.findByName.mockResolvedValue({ id: 'role1', name: 'estudiante' });
    userRepo.create.mockResolvedValue({ id: 'user2' });
    studentRepo.create.mockResolvedValue(null);

    await expect(useCase.execute({ studentName: 'Jane', studentLastname: 'Smith', studentCode: 'S002' }))
      .rejects.toBeInstanceOf(InternalServerError);
  });
});
