import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SAVED_EXAM_REPO } from '../../tokens';
import type { SavedExamRepositoryPort } from '../../domain/ports/saved-exam.repository.port';

export type SaveSavedExamCommand = {
  title: string;
  courseId: string;
  teacherId: string;
  examId: string;
  status?: 'Guardado' | 'Publicado';
};

@Injectable()
export class SaveSavedExamUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SAVED_EXAM_REPO) private readonly repo: SavedExamRepositoryPort,
  ) {}

  async execute(cmd: SaveSavedExamCommand) {
    if (!cmd.title?.trim()) throw new BadRequestException('Datos inválidos: title requerido.');
    if (!cmd.courseId?.trim()) throw new BadRequestException('Datos inválidos: courseId requerido.');
    if (!cmd.examId?.trim()) throw new BadRequestException('Datos inválidos: examId requerido.');

    const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId: cmd.teacherId } });
    if (!teacher) throw new ForbiddenException('Acceso no autorizado (se requiere rol docente).');

    const course = await this.prisma.course.findUnique({ where: { id: cmd.courseId } });
    if (!course) throw new BadRequestException('Datos inválidos: courseId no existe.');
    if (course.teacherId !== cmd.teacherId) {
      throw new ForbiddenException('Acceso no autorizado al curso.');
    }

    const exam = await this.prisma.exam.findUnique({ where: { id: cmd.examId } });
    if (!exam) throw new BadRequestException('Datos inválidos: examId no existe.');

    return this.repo.save({
      title: cmd.title.trim(),
      courseId: cmd.courseId,
      teacherId: cmd.teacherId,
      examId: cmd.examId,
      status: cmd.status ?? 'Guardado',
    });
  }
}