import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import type { ExamQuestionRepositoryPort, InsertPosition } from '../../domain/ports/exam-question.repository.port';
import type { ExamQuestion, NewExamQuestion } from '../../domain/entities/exam-question.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExamQuestionPrismaRepository implements ExamQuestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(ExamQuestionPrismaRepository.name);

  async existsExam(examId: string): Promise<boolean> {
    const c = await this.prisma.exam.count({ where: { id: examId } });
    return c > 0;
  }

  async countByExam(examId: string): Promise<number> {
    return this.prisma.examQuestion.count({ where: { examId } });
  }

  async addToExam(examId: string, q: NewExamQuestion, position: InsertPosition): Promise<ExamQuestion> {
    this.logger.log(`addToExam -> examId=${examId}, kind=${q.kind}, position=${position}`);
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.examQuestion.count({ where: { examId } });

      let insertionOrder = 1;
      if (position === 'start') insertionOrder = 1;
      else if (position === 'end') insertionOrder = count + 1;
      else if (position === 'middle') insertionOrder = Math.floor(count / 2) + 1;
      this.logger.log(`addToExam -> computed insertionOrder=${insertionOrder} (existing=${count})`);

      if (insertionOrder <= count) {
        await tx.examQuestion.updateMany({
          where: { examId, order: { gte: insertionOrder } },
          data: { order: { increment: 1 } },
        });
      }

      const created = await tx.examQuestion.create({
        data: {
          examId,
          kind: q.kind as any, 
          text: q.text,
          options: q.options ? (q.options as unknown as Prisma.InputJsonValue) : undefined,
          correctOptionIndex: q.correctOptionIndex ?? null,
          correctBoolean: q.correctBoolean ?? null,
          expectedAnswer: q.expectedAnswer ?? null,
          order: insertionOrder,
        },
      });
      this.logger.log(`addToExam -> question created id=${created.id}`);

      // sincroniza contadores + totalQuestions en el mismo commit
      const data: Prisma.ExamUpdateArgs['data'] = { totalQuestions: { increment: 1 } };
      if (q.kind === 'MULTIPLE_CHOICE') data.mcqCount = { increment: 1 };
      else if (q.kind === 'TRUE_FALSE') data.trueFalseCount = { increment: 1 };
      else if (q.kind === 'OPEN_ANALYSIS') data.openAnalysisCount = { increment: 1 };
      else if (q.kind === 'OPEN_EXERCISE') data.openExerciseCount = { increment: 1 };

      await tx.exam.update({ where: { id: examId }, data });
      this.logger.log(`addToExam -> counters updated for examId=${examId}`);

      return {
        id: created.id,
        examId: created.examId,
        kind: q.kind,
        text: created.text,
        options: (created as any).options ?? undefined,
        correctOptionIndex: created.correctOptionIndex ?? undefined,
        correctBoolean: created.correctBoolean ?? undefined,
        expectedAnswer: created.expectedAnswer ?? undefined,
        order: created.order,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    });
  }

    async findById(id: string) {
    const row = await this.prisma.examQuestion.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      examId: row.examId,
      kind: row.kind as any,
      text: row.text,
      options: (row as any).options ?? undefined,
      correctOptionIndex: row.correctOptionIndex ?? undefined,
      correctBoolean: row.correctBoolean ?? undefined,
      expectedAnswer: row.expectedAnswer ?? undefined,
      order: row.order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async update(id: string, patch: { text?: string; options?: string[]; correctOptionIndex?: number; correctBoolean?: boolean; expectedAnswer?: string; }) {
    this.logger.log(`update -> id=${id}`);
    const data: any = {};
    if (patch.text != null) data.text = patch.text;
    if (patch.options != null) (data as any).options = patch.options as any; // JSON
    if (patch.correctOptionIndex != null) data.correctOptionIndex = patch.correctOptionIndex;
    if (patch.correctBoolean != null) data.correctBoolean = patch.correctBoolean;
    if (patch.expectedAnswer != null) data.expectedAnswer = patch.expectedAnswer;

    const updated = await this.prisma.examQuestion.update({ where: { id }, data });
    this.logger.log(`update <- id=${updated.id}`);

    return {
      id: updated.id,
      examId: updated.examId,
      kind: updated.kind as any,
      text: updated.text,
      options: (updated as any).options ?? undefined,
      correctOptionIndex: updated.correctOptionIndex ?? undefined,
      correctBoolean: updated.correctBoolean ?? undefined,
      expectedAnswer: updated.expectedAnswer ?? undefined,
      order: updated.order,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

    async listByExam(examId: string) {
    const rows = await this.prisma.examQuestion.findMany({
      where: { examId },
      orderBy: { order: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      examId: row.examId,
      kind: row.kind as any,
      text: row.text,
      options: (row as any).options ?? undefined,
      correctOptionIndex: row.correctOptionIndex ?? undefined,
      correctBoolean: row.correctBoolean ?? undefined,
      expectedAnswer: row.expectedAnswer ?? undefined,
      order: row.order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

}
