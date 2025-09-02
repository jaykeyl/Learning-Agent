import { Inject, Injectable } from "@nestjs/common";
import { COURSE_REPO } from "../../tokens";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import { Course } from "../../domain/entities/course.entity";
import { NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class GetCourseByIdUseCase {
    constructor (
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
    ) {}

    async execute(courseId: string): Promise<Course | null> {
        const course = await this.courseRepo.findById(courseId);

        if(!course) {
            console.error(`Course not found with Id ${course}`)
            throw new NotFoundError(`No se ha podido recuperar la información de la materia`)
        }

        return course.isActive ? course : null;
    }
}