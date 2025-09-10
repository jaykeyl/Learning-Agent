import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENROLLMENT_REPO, CLASSES_REPO, STUDENT_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import { Classes } from "../../domain/entities/classes.entity";
import { NotFoundError } from "../../../../shared/handler/errors";

@Injectable()
export class GetClassesByStudentUseCase {
    private readonly logger = new Logger(GetClassesByStudentUseCase.name)
    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
    ) {}

    async execute(studentId: string): Promise<Classes[]> {
        const student = await this.studentRepo.findByUserId(studentId);
        if (!student) {
            this.logger.error(`Student not found with id ${studentId}`)
            throw new NotFoundError(`No se ha podido recuperar la información del estudiante`)
        }
        
        const enrollmentIDs = await this.enrollmentRepo.findByStudentId(studentId);
        const classes = await this.findClasses(enrollmentIDs);
        return classes;
    }

    async findClasses(enrollmentIDs: any[]): Promise<Classes[]> {
        const classes: Classes[] = [];
        for (const enrollment of enrollmentIDs) {
            const ojbClass = await this.classesRepo.findById(enrollment.classId);
            if (!ojbClass) continue;
            if (ojbClass?.isActive) classes.push(ojbClass);
        }
        return classes;
    }
}