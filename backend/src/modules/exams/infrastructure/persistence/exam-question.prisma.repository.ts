import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import type {
  ExamQuestionRepositoryPort,
  UpdateExamQuestionPatch,
} from '../../domain/ports/exam-question.repository.port';
import { ExamQuestion, NewExamQuestion } from '../../domain/entities/exam-question.entity';
import { Prisma } from '@prisma/client'; 

const map = (q: any): ExamQuestion => ({
  id: q.id,
  examId: q.examId,
  kind: q.kind,
  text: q.text,
  options: q.options ?? null,
  correctOptionIndex: q.correctOptionIndex ?? null,
  correctBoolean: q.correctBoolean ?? null,
  expectedAnswer: q.expectedAnswer ?? null,
  order: q.order,
  createdAt: q.createdAt,
  updatedAt: q.updatedAt,
});

@Injectable()
export class ExamQuestionPrismaRepository implements ExamQuestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async existsExamOwned(examId: string, teacherId: string): Promise<boolean> {
    const count = await this.prisma.exam.count({
      where: { id: examId, class: { is: { course: { teacherId } } } }, 
    });
    return count > 0;
  }

  async countByExamOwned(examId: string, teacherId: string): Promise<number> {
    return this.prisma.examQuestion.count({
      where: { examId, exam: { is: { class: { is: { course: { teacherId } } } } } }, 
    });
  }

  async listByExamOwned(examId: string, teacherId: string) {
    const rows = await this.prisma.examQuestion.findMany({
      where: { examId, exam: { is: { class: { is: { course: { teacherId } } } } } },
      orderBy: { order: 'asc' },
    });
    return rows.map(map);
  }

  async addToExamOwned(
    examId: string,
    teacherId: string,
    q: NewExamQuestion,
    position: 'start' | 'middle' | 'end',
  ): Promise<ExamQuestion> {
    const owned = await this.existsExamOwned(examId, teacherId);
    if (!owned) throw new Error('Examen no encontrado o acceso no autorizado');

    const count = await this.countByExamOwned(examId, teacherId);
    let newOrder = count;
    if (position === 'start') newOrder = 0;
    else if (position === 'middle') newOrder = Math.floor(count / 2);

    if (position !== 'end') {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "ExamQuestion" SET "order" = "order" + 1 WHERE "examId" = $1`,
        examId,
      );
    }

    const data: Parameters<typeof this.prisma.examQuestion.create>[0]['data'] = {
      examId,
      kind: q.kind as any,
      text: q.text,
      ...(q.options === undefined
        ? {}
        : { options: q.options === null ? Prisma.JsonNull : (q.options as unknown as Prisma.InputJsonValue) }),
      ...(q.correctOptionIndex === undefined ? {} : { correctOptionIndex: q.correctOptionIndex }),
      ...(q.correctBoolean === undefined ? {} : { correctBoolean: q.correctBoolean }),
      ...(q.expectedAnswer === undefined ? {} : { expectedAnswer: q.expectedAnswer }),
      order: newOrder,
    };

    const created = await this.prisma.examQuestion.create({ data });
    return map(created);
  }

  async findByIdOwned(id: string, teacherId: string) {
    const row = await this.prisma.examQuestion.findFirst({
      where: { id, exam: { is: { class: { is: { course: { teacherId } } } } } },
    });
    return row ? map(row) : null;
  }

  async updateOwned(id: string, teacherId: string, patch: UpdateExamQuestionPatch) {
    await this.prisma.examQuestion.updateMany({
      where: { id, exam: { is: { class: { is: { course: { teacherId } } } } } },
      data: {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.options !== undefined
          ? { options: patch.options === null ? Prisma.JsonNull : (patch.options as unknown as Prisma.InputJsonValue) }
          : {}),
        ...(patch.correctOptionIndex !== undefined ? { correctOptionIndex: patch.correctOptionIndex } : {}),
        ...(patch.correctBoolean !== undefined ? { correctBoolean: patch.correctBoolean } : {}),
        ...(patch.expectedAnswer !== undefined ? { expectedAnswer: patch.expectedAnswer } : {}),
      },
    });

    const row = await this.prisma.examQuestion.findFirst({
      where: { id, exam: { is: { class: { is: { course: { teacherId } } } } } },
    });
    if (!row) throw new Error('Pregunta no encontrada o acceso no autorizado');
    return map(row);
  }
}
