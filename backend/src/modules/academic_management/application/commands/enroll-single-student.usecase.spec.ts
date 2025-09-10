import { EnrollSingleStudentUseCase } from './enroll-single-student.usecase';
import { NotFoundError, AlreadyCreatedError } from '../../../../shared/handler/errors';
import { Logger } from '@nestjs/common/services/logger.service';

describe('EnrollSingleStudentUseCase', () => {
  let useCase: EnrollSingleStudentUseCase;
  let enrollmentRepo: any;
  let studentRepo: any;
  let classesRepo: any;
  let createStudent: any;

  beforeEach(() => {
    enrollmentRepo = {
      findByStudentAndClass: jest.fn(),
      enableEnrollment: jest.fn(),
      create: jest.fn(),
    };
    studentRepo = { findByCode: jest.fn() };
    classesRepo = { findById: jest.fn() };
    createStudent = { execute: jest.fn() };

    useCase = new EnrollSingleStudentUseCase(enrollmentRepo, studentRepo, classesRepo, createStudent);
    // Silenciar logs de errores en consola
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Si usas Logger de NestJS:
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should throw NotFoundError if class not found', async () => {
    classesRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ studentName: 'J', studentLastname: 'D', studentCode: 'S1', classId: 'c1' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should create student if not found and then enroll', async () => {
    const input = { studentName: 'John', studentLastname: 'Doe', studentCode: 'S1', classId: 'c1' };
    const fakeStudent = { userId: 'u1' };
    const fakeEnrollment = { studentId: 'u1', classId: 'c1' };

    classesRepo.findById.mockResolvedValue({ id: 'c1' });
    studentRepo.findByCode.mockResolvedValue(null);
    createStudent.execute.mockResolvedValue(fakeStudent);
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(null);
    enrollmentRepo.create.mockResolvedValue(fakeEnrollment);

    const result = await useCase.execute(input);

    expect(createStudent.execute).toHaveBeenCalledWith(input);
    expect(enrollmentRepo.create).toHaveBeenCalledWith('u1', 'c1');
    expect(result).toBe(fakeEnrollment);
  });

  it('should re-enable enrollment if inactive', async () => {
    const input = { studentName: 'A', studentLastname: 'B', studentCode: 'S2', classId: 'c2' };
    const student = { userId: 'u2' };
    const enrollment = { studentId: 'u2', classId: 'c2', isActive: false };

    classesRepo.findById.mockResolvedValue({ id: 'c2' });
    studentRepo.findByCode.mockResolvedValue(student);
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(enrollment);

    const result = await useCase.execute(input);

    expect(enrollmentRepo.enableEnrollment).toHaveBeenCalledWith('u2', 'c2');
    expect(result.isActive).toBe(true);
  });

  it('should throw AlreadyCreatedError if enrollment already active', async () => {
    const input = { studentName: 'A', studentLastname: 'B', studentCode: 'S3', classId: 'c3' };
    const student = { userId: 'u3' };
    const enrollment = { studentId: 'u3', classId: 'c3', isActive: true };

    classesRepo.findById.mockResolvedValue({ id: 'c3' });
    studentRepo.findByCode.mockResolvedValue(student);
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(enrollment);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(AlreadyCreatedError);
  });
});
