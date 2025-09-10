import { CreateStudentUseCase } from './create-student.usecase';
import { Student } from '../../domain/entities/student.entity';
import { Logger } from '@nestjs/common/services/logger.service';

describe('CreateStudentUseCase', () => {
  let useCase: CreateStudentUseCase;
  let studentRepo: any;

  beforeEach(() => {
    studentRepo = { create: jest.fn() };
    useCase = new CreateStudentUseCase(studentRepo);
    // Silenciar logs de errores en consola
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Si usas Logger de NestJS:
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should create a student successfully', async () => {
    const input = {
      userId: 'user123',
      code: 'S001',
      career: 'Computer Science',
      admissionYear: 2025,
    };

    const createdStudent: Student = {
      userId: input.userId,
      code: input.code,
      career: input.career,
      admissionYear: input.admissionYear,
    } as Student;

    studentRepo.create.mockResolvedValue(createdStudent);

    const result = await useCase.execute(input);

    expect(studentRepo.create).toHaveBeenCalledWith(
      input.userId,
      input.code,
      input.career,
      input.admissionYear,
    );
    expect(result).toBe(createdStudent);
  });

  it('should return null if repository returns null', async () => {
    const input = { userId: 'u1', code: 'S002' };

    studentRepo.create.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(studentRepo.create).toHaveBeenCalledWith('u1', 'S002', undefined, undefined);
    expect(result).toBeNull();
  });

  it('should propagate errors from repository', async () => {
    const input = { userId: 'u2', code: 'S003' };

    studentRepo.create.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute(input)).rejects.toThrow('DB error');
  });
});
