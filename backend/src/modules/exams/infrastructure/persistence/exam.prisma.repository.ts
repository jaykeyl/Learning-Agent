import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { Exam } from '../../domain/entities/exam.entity';
import { Difficulty } from '../../domain/entities/difficulty.vo';
import { PositiveInt } from '../../domain/entities/positive-int.vo';

const selectExam = {
  id: true,
  title: true,
  status: true,
  classId: true,
  subject: true,
  difficulty: true,      
  attempts: true,        
  totalQuestions: true,  
  timeMinutes: true,     
  reference: true,
  mcqCount: true,
  trueFalseCount: true,
  openAnalysisCount: true,
  openExerciseCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

function unwrap<T>(x: any): T {
  return typeof x?.getValue === 'function' ? x.getValue() : x;
}

function mapRowToDomain(r: any): Exam {
  return new Exam(
    r.id,
    r.title,
    r.status,
    r.classId,
    r.subject,
    Difficulty.create(r.difficulty),
    PositiveInt.create('attempts', r.attempts),
    PositiveInt.create('totalQuestions', r.totalQuestions),
    PositiveInt.create('timeMinutes', r.timeMinutes),
    r.reference,
    r.mcqCount,
    r.trueFalseCount,
    r.openAnalysisCount,
    r.openExerciseCount,
    r.createdAt,
    r.updatedAt,
  );
}

@Injectable()
export class ExamPrismaRepository implements ExamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(exam: Exam): Promise<Exam> {
    const row = await this.prisma.exam.create({
      data: {
        id: exam.id,
        title: exam.title,
        status: exam.status as any,
        classId: exam.classId,
        subject: exam.subject,

        difficulty: unwrap<string>(exam.difficulty),
        attempts: unwrap<number>(exam.attempts),
        totalQuestions: unwrap<number>(exam.totalQuestions),
        timeMinutes: unwrap<number>(exam.timeMinutes),

        reference: exam.reference,
        mcqCount: exam.mcqCount,
        trueFalseCount: exam.trueFalseCount,
        openAnalysisCount: exam.openAnalysisCount,
        openExerciseCount: exam.openExerciseCount,
      },
      select: selectExam,
    });
    return mapRowToDomain(row);
  }

  async findByIdOwned(id: string, teacherId: string): Promise<Exam | null> {
    const row = await this.prisma.exam.findFirst({
      where: { id, class: { is: { course: { teacherId } } } }, 
      select: selectExam,
    });
    return row ? mapRowToDomain(row) : null;
  }

  async listByClassOwned(classId: string, teacherId: string): Promise<Exam[]> {
    const rows = await this.prisma.exam.findMany({
      where: { classId, class: { is: { course: { teacherId } } } },
      orderBy: { createdAt: 'desc' },
      select: selectExam,
    });
    return rows.map(mapRowToDomain);
  }

  async updateMetaOwned(
    id: string,
    teacherId: string,
    patch: Partial<Pick<Exam, 'title' | 'status' | 'classId'>>,
  ): Promise<Exam> {
    await this.prisma.exam.updateMany({
      where: { id, class: { is: { course: { teacherId } } } },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.status !== undefined ? { status: patch.status as any } : {}),
        ...(patch.classId !== undefined ? { classId: patch.classId } : {}),
      },
    });

    const row = await this.prisma.exam.findFirst({
      where: { id, class: { is: { course: { teacherId } } } },
      select: selectExam,
    });
    if (!row) throw new Error('Examen no encontrado o acceso no autorizado');
    return mapRowToDomain(row);
  }
}
