import { EnrollGroupStudentUseCase } from './enroll-group-students.usecase';
import { NotFoundError } from '../../../../shared/handler/errors';
import { Logger } from '@nestjs/common/services/logger.service';

describe('EnrollGroupStudentUseCase', () => {
  let useCase: EnrollGroupStudentUseCase;
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

    useCase = new EnrollGroupStudentUseCase(enrollmentRepo, studentRepo, classesRepo, createStudent);
    // Silenciar logs de errores en consola
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Si usas Logger de NestJS:
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should throw NotFoundError if class does not exist', async () => {
    classesRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ classId: 'c1', studentRows: [] })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should enroll new student created by CreateStudentProfileUseCase', async () => {
    const input = {
      classId: 'c1',
      studentRows: [{ studentName: 'John', studentLastname: 'Doe', studentCode: 'S001' }],
    };
    const fakeStudent = { userId: 'u1', code: 'S001' };
    const fakeEnrollment = { studentId: 'u1', classId: 'c1' };

    classesRepo.findById.mockResolvedValue({ id: 'c1' });
    studentRepo.findByCode.mockResolvedValue(null);
    createStudent.execute.mockResolvedValue(fakeStudent);
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(null);
    enrollmentRepo.create.mockResolvedValue(fakeEnrollment);

    const result = await useCase.execute(input);

    expect(createStudent.execute).toHaveBeenCalledWith({
      studentName: 'John',
      studentLastname: 'Doe',
      studentCode: 'S001',
    });
    expect(enrollmentRepo.create).toHaveBeenCalledWith('u1', 'c1');
    expect(result.successRows).toBe(1);
  });

  it('should increment existingRows if enrollment already active', async () => {
    const input = { classId: 'c1', studentRows: [{ studentName: 'A', studentLastname: 'B', studentCode: 'S002' }] };
    const student = { userId: 'u2', code: 'S002' };
    const enrollment = { studentId: 'u2', classId: 'c1', isActive: true };

    classesRepo.findById.mockResolvedValue({ id: 'c1' });
    studentRepo.findByCode.mockResolvedValue(student);
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(enrollment);

    const result = await useCase.execute(input);

    expect(result.existingRows).toBe(1);
  });

  it('should re-enable enrollment if it exists but inactive', async () => {
    const input = { classId: 'c1', studentRows: [{ studentName: 'C', studentLastname: 'D', studentCode: 'S003' }] };
    const student = { userId: 'u3', code: 'S003' };
    const enrollment = { studentId: 'u3', classId: 'c1', isActive: false };

    classesRepo.findById.mockResolvedValue({ id: 'c1' });
    studentRepo.findByCode.mockResolvedValue(student);
    enrollmentRepo.findByStudentAndClass.mockResolvedValue(enrollment);

    const result = await useCase.execute(input);

    expect(enrollmentRepo.enableEnrollment).toHaveBeenCalledWith('u3', 'c1');
    expect(result.successRows).toBe(1);
  });
});
