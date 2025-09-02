import { Inject, Injectable } from '@nestjs/common';
import { CLASSES_REPO, COURSE_REPO, TEACHER_REPO } from '../../tokens';
import type { ClassesRepositoryPort } from '../../domain/ports/classes.repository.ports';
import type { CourseRepositoryPort } from '../../domain/ports/courses.repository.ports';
import type { ProfessorRepositoryPort } from '../../domain/ports/teacher.repository.ports';
import { Classes } from '../../domain/entities/classes.entity'
import { ForbiddenError, NotFoundError } from 'src/shared/handler/errors';

@Injectable()
export class CreateClassUseCase {
  constructor(
    @Inject(TEACHER_REPO) private readonly teacherRepo: ProfessorRepositoryPort,
    @Inject(CLASSES_REPO) private readonly classRepo: ClassesRepositoryPort,
    @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
  ) {}
  async execute(input: {
    teacherId: string,
    courseId: string,
    semester: string,
    dateBegin: Date,
    dateEnd: Date
  }): Promise<Classes> {
    const teacher = await this.teacherRepo.findByUserId(input.teacherId)
    if (!teacher) {
      console.error(`Teacher not found with id ${input.teacherId}`)
      throw new NotFoundError(`No se ha podido recuperar la información del Docente`)
    }
    
    const course = await this.courseRepo.findById(input.courseId)
    if (!course) {
      console.error(`Course not found with id ${input.courseId}`)
      throw new NotFoundError(`No se ha podido recupear la información de la materia`)
    }

    if (course.teacherId != teacher.userId) {
      console.error(`Course ${course.id} doesnt belongs to teacher ${teacher.userId}`)
      throw new ForbiddenError(`El docente proporcionado no posee permisos sobre esta materia`)
    }

    const className = `${course.name}-${input.semester}`

    return this.classRepo.create(
      className,
      input.semester,
      input.courseId,
      input.dateBegin,
      input.dateEnd
    );
  }
}
