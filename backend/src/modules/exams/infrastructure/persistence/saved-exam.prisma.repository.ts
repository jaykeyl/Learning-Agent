import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import type {
  SaveSavedExamInput,
  SavedExamDTO,
  SavedExamRepositoryPort,
  SavedExamReadModel,
  SavedExamStatus
} from '../../domain/ports/saved-exam.repository.port';


function asSavedExamStatus(s: unknown): SavedExamStatus {
  if (s === 'Guardado' || s === 'Publicado') return s;
  throw new Error(`Unexpected SavedExam.status from DB: ${String(s)}`);
}
@Injectable()
export class SavedExamPrismaRepository implements SavedExamRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: SaveSavedExamInput): Promise<SavedExamDTO> {
    const row = await this.prisma.savedExam.create({
      data: {
        title: data.title,
        status: (data.status ?? 'Guardado') as any,
        courseId: data.courseId,
        teacherId: data.teacherId,
        exam: { connect: { id: data.examId } },
      },
    });

    return {
      id: row.id,
      title: row.title,
      status: row.status as any,
      courseId: row.courseId,
      teacherId: row.teacherId,
      createdAt: row.createdAt,
      source: 'saved',
      examId: row.examId,
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
      status: r.status as any,
      courseId: r.courseId,
      teacherId: r.teacherId,
      createdAt: r.createdAt,
      source: 'saved',
      examId: r.examId,
    }));
    }

async findByExamId(examId: string): Promise<SavedExamReadModel | null> {
    const r = await this.prisma.savedExam.findFirst({ where: { examId } });
    if (!r) return null;

    return {
      id: r.id,
      title: r.title,
      status: asSavedExamStatus(r.status), // <-- narrow to the union
      courseId: r.courseId,
      teacherId: r.teacherId,
      createdAt: r.createdAt,
      examId: r.examId,
    };
  }


}