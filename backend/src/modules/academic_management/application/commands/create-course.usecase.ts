import { Inject, Injectable } from "@nestjs/common";
import { COURSE_REPO, TEACHER_REPO } from "../../tokens";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import type { ProfessorRepositoryPort } from "../../domain/ports/teacher.repository.ports";
import { NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class CreateCourseUseCase {
    constructor (
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
        @Inject(TEACHER_REPO) private readonly teacherRepo: ProfessorRepositoryPort
    ) {}

    async execute (input: { teacherId: string; name: string }) {
        const teacher = await this.teacherRepo.findByUserId(input.teacherId);
        if (!teacher) {
            console.error(`No Teacher with ID ${input.teacherId}`)
            throw new NotFoundError(`No se ha podido recuperar la información del Docente`)
        }

        return this.courseRepo.create(input.name, input.teacherId);
    }
}