import { Inject, Injectable, Logger } from "@nestjs/common";
import { CLASSES_REPO, COURSE_REPO } from "../../tokens";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import { Classes } from "../../domain/entities/classes.entity";
import { NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class GetClassesByCourseUseCase {
    private readonly logger = new Logger(GetClassesByCourseUseCase.name)
    constructor(
        @Inject(CLASSES_REPO) private readonly classRepo: ClassesRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort
    ) {}

    async execute (courseId: string): Promise<Classes[]> {
        const course = await this.courseRepo.findById(courseId);
        if (!course) {
            this.logger.error(`No Course with ID ${courseId}`);
            throw new NotFoundError(`No se ha podido recuperar la información de la materia`);
        }
        
        return this.classRepo.findByCourseId(course.id);
    }
}