import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { Exam } from '../../domain/entities/exam.entity';
import { ExamFactory } from '../../domain/entities/exam.factory';

@Injectable()
export class PrismaExamRepository implements ExamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(exam: Exam): Promise<Exam> {
    const created = await this.prisma.exam.create({
      data: {
        id: exam.id,
        title: exam.title,
        status: exam.status as any, 
        classId: exam.classId,
        difficulty: exam.difficulty.getValue(),
        attempts: exam.attempts.getValue(),
        timeMinutes: exam.timeMinutes.getValue(),
        reference: exam.reference,
      },
    });

    return ExamFactory.rehydrate({
      id: created.id,
      title: created.title,
      status: created.status as any,
      classId: created.classId,
      difficulty: created.difficulty,
      attempts: created.attempts,
      timeMinutes: created.timeMinutes,
      reference: created.reference,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findByIdOwned(id: string, teacherId: string): Promise<Exam | null> {
    const found = await this.prisma.exam.findFirst({
      where: {
        id,
        class: {
          course: {
            teacherId,
          },
        },
      },
    });
    if (!found) return null;

    return ExamFactory.rehydrate({
      id: found.id,
      title: found.title,
      status: found.status as any,
      classId: found.classId,
      difficulty: found.difficulty,
      attempts: found.attempts,
      timeMinutes: found.timeMinutes,
      reference: found.reference,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    });
  }

  async listByClassOwned(classId: string, teacherId: string): Promise<Exam[]> {
    const rows = await this.prisma.exam.findMany({
      where: {
        classId,
        class: { course: { teacherId } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((r) =>
      ExamFactory.rehydrate({
        id: r.id,
        title: r.title,
        status: r.status as any,
        classId: r.classId,
        difficulty: r.difficulty,
        attempts: r.attempts,
        timeMinutes: r.timeMinutes,
        reference: r.reference,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
  }

  async updateMetaOwned(
    id: string,
    teacherId: string,
    patch: Partial<Pick<Exam, 'title' | 'status' | 'classId'>>,
  ): Promise<Exam> {
    if (patch.classId) {
      const target = await this.prisma.classes.findFirst({
        where: { id: patch.classId, course: { teacherId } },
        select: { id: true },
      });
      if (!target) {
        throw new Error('Target classId is not owned by teacher.');
      }
    }

    const updated = await this.prisma.exam.update({
      where: {
        id,
      },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.status !== undefined ? { status: patch.status as any } : {}),
        ...(patch.classId !== undefined ? { classId: patch.classId } : {}),
      },
    });

    const isOwned = await this.prisma.exam.count({
      where: { id, class: { course: { teacherId } } },
    });
    if (isOwned === 0) {
      throw new Error('Exam not found or not owned by teacher.');
    }

    return ExamFactory.rehydrate({
      id: updated.id,
      title: updated.title,
      status: updated.status as any,
      classId: updated.classId,
      difficulty: updated.difficulty,
      attempts: updated.attempts,
      timeMinutes: updated.timeMinutes,
      reference: updated.reference,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }

    async teacherOwnsClass(classId: string, teacherId: string): Promise<boolean> {
    const owns = await this.prisma.classes.count({
      where: { id: classId, course: { teacherId } },
    });
    return owns > 0;
  }

    async deleteOwned(id: string, teacherId: string): Promise<void> {
    const found = await this.prisma.exam.findFirst({
      where: {
        id,
        class: { course: { teacherId } },
      },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Examen no encontrado');
    }
    await this.prisma.exam.delete({ where: { id } });
  }
}