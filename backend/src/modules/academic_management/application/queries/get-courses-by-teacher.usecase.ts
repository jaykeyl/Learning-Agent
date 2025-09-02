import { Inject, Injectable } from "@nestjs/common";
import { COURSE_REPO, TEACHER_REPO } from "../../tokens";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import type { ProfessorRepositoryPort } from "../../domain/ports/teacher.repository.ports";
import { Course } from "../../domain/entities/course.entity";
import { NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class GetCoursesByTeacherUseCase {
    constructor(
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
        @Inject(TEACHER_REPO) private readonly teacherRepo: ProfessorRepositoryPort
    ) {}

    async execute (teacherId: string): Promise<Course[]> {
        const teacher = await this.teacherRepo.findByUserId(teacherId);
        if (!teacher) {
            console.error(`No Teacher with ID ${teacherId}`)
            throw new NotFoundError(`No se ha podido recuperar la información del Docente`)
        }

        return this.courseRepo.findByTeacherId(teacherId);
    }
}