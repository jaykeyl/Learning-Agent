import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { COURSE_EXAMS_HARDCODED, SAVED_EXAM_REPO } from '../../tokens';
import type { SavedExamRepositoryPort, SavedExamDTO } from '../../domain/ports/saved-exam.repository.port';
import type { CourseExamsProvider } from '../../infrastructure/http/providers/course-hardcoded-exams.provider';
import { UnauthorizedError, NotFoundError } from 'src/shared/handler/errors';

export type ListCourseExamsQuery = { courseId: string; teacherId: string };

@Injectable()
export class ListCourseExamsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SAVED_EXAM_REPO) private readonly repo: SavedExamRepositoryPort,
    @Inject(COURSE_EXAMS_HARDCODED) private readonly provider: CourseExamsProvider,
  ) {}



  async execute(q: ListCourseExamsQuery): Promise<SavedExamDTO[]> {
    const course = await this.prisma.course.findUnique({ where: { id: q.courseId } });
    if (!course) throw new NotFoundError('Curso no encontrado');
    if (course.teacherId !== q.teacherId) throw new UnauthorizedError('Acceso no autorizado');

    const saved = await this.repo.listByCourse(q.courseId, q.teacherId);
    const hardcoded = await this.provider.list(q.courseId);
    return [...saved, ...hardcoded];
  }
}