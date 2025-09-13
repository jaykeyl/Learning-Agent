import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SAVED_EXAM_REPO } from '../../tokens';
import type { SavedExamRepositoryPort, SavedExamDTO } from '../../domain/ports/saved-exam.repository.port';
import { UnauthorizedError, NotFoundError } from 'src/shared/handler/errors';

export type ListCourseExamsQuery = { courseId: string; teacherId: string };

@Injectable()
export class ListCourseExamsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SAVED_EXAM_REPO) private readonly repo: SavedExamRepositoryPort,
  ) {}



  async execute(q: ListCourseExamsQuery): Promise<SavedExamDTO[]> {
    const course = await this.prisma.course.findUnique({ where: { id: q.courseId } });
    if (!course) throw new NotFoundError('Curso no encontrado');
    if (course.teacherId !== q.teacherId) throw new UnauthorizedError('Acceso no autorizado');

    const saved = await this.repo.listByCourse(q.courseId, q.teacherId);
    return [...saved];
  }
}