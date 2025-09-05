import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import type {
  SaveApprovedExamInput,
  SavedExamDTO,
  SavedExamRepositoryPort,
} from '../../domain/ports/saved-exam.repository.port';

@Injectable()
export class SavedExamPrismaRepository implements SavedExamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: SaveApprovedExamInput): Promise<SavedExamDTO> {
    const row = await this.prisma.savedExam.create({
      data: {
        title: data.title,
        content: data.content as any,
        status: (data.status ?? 'Guardado') as any,
        courseId: data.courseId,
        teacherId: data.teacherId,
      },
    });

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      status: row.status as any,
      courseId: row.courseId,
      teacherId: row.teacherId,
      createdAt: row.createdAt,
      source: 'saved',
    };
  }

  async listByCourse(courseId: string, teacherId?: string): Promise<SavedExamDTO[]> {
    const rows = await this.prisma.savedExam.findMany({
      where: { courseId, ...(teacherId ? { teacherId } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      status: r.status as any,
      courseId: r.courseId,
      teacherId: r.teacherId,
      createdAt: r.createdAt,
      source: 'saved',
    }));
    }
}