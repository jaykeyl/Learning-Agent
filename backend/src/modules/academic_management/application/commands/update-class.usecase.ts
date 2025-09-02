import { Inject, Injectable } from "@nestjs/common";
import { CLASSES_REPO, COURSE_REPO } from "../../tokens";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { CourseRepositoryPort } from "../../domain/ports/courses.repository.ports";
import { Classes } from "../../domain/entities/classes.entity";
import { ForbiddenError, NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class UpdateClassUseCase {
    constructor(
        @Inject(CLASSES_REPO) private readonly classRepo: ClassesRepositoryPort,
        @Inject(COURSE_REPO) private readonly courseRepo: CourseRepositoryPort,
    ) { }

    async execute(input: {
        teacherId: string, classId: string, name: string,
        semester : string, dateBegin: Date, dateEnd: Date
    }): Promise<Classes> {

        const objClass = await this.classRepo.findById(input.classId)
        if (!objClass) {
            console.error(`Class not found with id ${input.classId}`)
            throw new NotFoundError(`No se ha podido recuperar la información de la clase`)
        }

        const course = await this.courseRepo.findById(objClass.courseId)
        if (!course) {
            console.error(`Course not found with id ${objClass.courseId}`)
            throw new NotFoundError(`No se ha podido recuperar la información de la materia`)
        }
            
        if (course.teacherId != input.teacherId) {
            console.error(`Class ${objClass.id}-${objClass.name} doesnt belongs to teacher ${input.teacherId}`)
            throw new ForbiddenError(`El docente proporcionado no posee permisos sobre esta clase`)
        }

        const className = `${course.name}-${input.semester}`
        
        return this.classRepo.updateInfo(
            input.classId,
            className,
            input.semester,
            input.dateBegin,
            input.dateEnd
        );
    }
}