import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ForbiddenError, NotFoundError, BadRequestError } from 'src/shared/handler/errors';

import { PrismaService } from '../../../../core/prisma/prisma.service';
import type {
  ExamQuestionRepositoryPort,
  UpdateExamQuestionPatch,
  DerivedCounts,
} from '../../domain/ports/exam-question.repository.port';
import { ExamQuestion, NewExamQuestion } from '../../domain/entities/exam-question.entity'; 

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

  private async isExamOwnedByTeacher(examId: string, teacherId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ ok: number }>>`
      SELECT 1 AS ok
      FROM "Exam" e
      JOIN "Classes" c ON c."id" = e."classId"
      JOIN "Course"  cr ON cr."id" = c."courseId"
      WHERE e."id" = ${examId} AND cr."teacherId" = ${teacherId}
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async existsExamOwned(examId: string, teacherId: string): Promise<boolean> {
    return this.isExamOwnedByTeacher(examId, teacherId);
  }

  async countByExamOwned(examId: string, teacherId: string): Promise<number> {
    const owned = await this.isExamOwnedByTeacher(examId, teacherId);
    if (!owned) return 0;
    return this.prisma.examQuestion.count({ where: { examId } });
  }

  async listByExamOwned(examId: string, teacherId: string) {
    const owned = await this.isExamOwnedByTeacher(examId, teacherId);
    if (!owned) return [];
    const rows = await this.prisma.examQuestion.findMany({
      where: { examId },
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
    const owned = await this.isExamOwnedByTeacher(examId, teacherId);
    if (!owned) throw new ForbiddenError('Acceso no autorizado');

    const count = await this.prisma.examQuestion.count({ where: { examId } });
    let newOrder = count;
    if (position === 'start') newOrder = 0;
    else if (position === 'middle') newOrder = Math.floor(count / 2);

    if (position !== 'end') {
      await this.prisma.$executeRaw`
        UPDATE "ExamQuestion"
        SET "order" = "order" + 1
        WHERE "examId" = ${examId} AND "order" >= ${newOrder}
      `;
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
    const row = await this.prisma.examQuestion.findUnique({ where: { id } });
    if (!row) return null;

    const owned = await this.isExamOwnedByTeacher(row.examId, teacherId);
    if (!owned) return null;

    return map(row);
  }

  async updateOwned(id: string, teacherId: string, patch: UpdateExamQuestionPatch) {
    const current = await this.prisma.examQuestion.findUnique({
      where: { id },
      select: { examId: true, kind: true, options: true },
    });
    if (!current) throw new NotFoundError('Pregunta no encontrada');
    const owned = await this.isExamOwnedByTeacher(current.examId, teacherId);
    if (!owned) throw new ForbiddenError('Acceso no autorizado');

    const kind = current.kind;
    const newOptions = patch.options ?? (current.options as any[] | null);

    if (kind === 'MULTIPLE_CHOICE') {
      if (patch.correctOptionIndex != null) {
        if (!Number.isInteger(patch.correctOptionIndex)) {
          throw new BadRequestError('correctAnswer inválido: se esperaba un índice entero para MULTIPLE_CHOICE.');
        }
        if (!Array.isArray(newOptions) || patch.correctOptionIndex < 0 || patch.correctOptionIndex >= newOptions.length) {
          throw new BadRequestError('correctAnswer fuera de rango: índice no corresponde a options.');
        }
      }
    } else if (kind === 'TRUE_FALSE') {
      if (patch.correctBoolean != null && typeof patch.correctBoolean !== 'boolean') {
        throw new BadRequestError('correctAnswer inválido: se esperaba boolean para TRUE_FALSE.');
      }
    } else { // OPEN_*
      if (patch.expectedAnswer != null) {
      }
    }

    await this.prisma.examQuestion.update({
      where: { id },
      data: {
        ...(patch.text !== undefined ? { text: patch.text } : {}),
        ...(patch.options !== undefined
          ? {
              options:
                patch.options === null
                  ? Prisma.JsonNull
                  : (patch.options as unknown as Prisma.InputJsonValue),
            }
          : {}),
        ...(patch.correctOptionIndex !== undefined ? { correctOptionIndex: patch.correctOptionIndex } : {}),
        ...(patch.correctBoolean !== undefined ? { correctBoolean: patch.correctBoolean } : {}),
        ...(patch.expectedAnswer !== undefined ? { expectedAnswer: patch.expectedAnswer } : {}),
      },
    });

    const row = await this.prisma.examQuestion.findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Pregunta no encontrada');
      return map(row);
    }

  async countsByExamOwned(examId: string, teacherId: string): Promise<DerivedCounts> {
    const rows = await this.prisma.$queryRaw<Array<{ kind: string; count: number }>>`
      SELECT q."kind", COUNT(*)::int AS count
      FROM "ExamQuestion" q
      JOIN "Exam"     e  ON e."id"      = q."examId"
      JOIN "Classes"  c  ON c."id"      = e."classId"
      JOIN "Course"   cr ON cr."id"     = c."courseId"
      WHERE q."examId" = ${examId} AND cr."teacherId" = ${teacherId}
      GROUP BY q."kind"
    `;
    const get = (k: string) => rows.find(r => r.kind === k)?.count ?? 0;
    const total = rows.reduce((s, r) => s + r.count, 0);
    return {
      totalQuestions: total,
      mcqCount: get('MULTIPLE_CHOICE'),
      trueFalseCount: get('TRUE_FALSE'),
      openAnalysisCount: get('OPEN_ANALYSIS'),
      openExerciseCount: get('OPEN_EXERCISE'),
    };
  }

  async bulkCountsByExamIdsOwned(
    examIds: string[],
    teacherId: string,
  ): Promise<Map<string, DerivedCounts>> {
    const acc = new Map<string, DerivedCounts>();
    if (examIds.length === 0) return acc;

    const rows = await this.prisma.$queryRaw<Array<{ examId: string; kind: string; count: number }>>`
      SELECT q."examId", q."kind", COUNT(*)::int AS count
      FROM "ExamQuestion" q
      JOIN "Exam"     e  ON e."id"      = q."examId"
      JOIN "Classes"  c  ON c."id"      = e."classId"
      JOIN "Course"   cr ON cr."id"     = c."courseId"
      WHERE q."examId" IN (${Prisma.join(examIds)}) AND cr."teacherId" = ${teacherId}
      GROUP BY q."examId", q."kind"
    `;

    for (const { examId, kind, count } of rows) {
      const cur = acc.get(examId) ?? {
        totalQuestions: 0, mcqCount: 0, trueFalseCount: 0, openAnalysisCount: 0, openExerciseCount: 0,
      };
      cur.totalQuestions += count;
      if (kind === 'MULTIPLE_CHOICE') cur.mcqCount += count;
      else if (kind === 'TRUE_FALSE') cur.trueFalseCount += count;
      else if (kind === 'OPEN_ANALYSIS') cur.openAnalysisCount += count;
      else if (kind === 'OPEN_EXERCISE') cur.openExerciseCount += count;
      acc.set(examId, cur);
    }

    for (const id of examIds) {
      if (!acc.has(id)) {
        acc.set(id, { totalQuestions: 0, mcqCount: 0, trueFalseCount: 0, openAnalysisCount: 0, openExerciseCount: 0 });
      }
    }
    return acc;
  }
}
