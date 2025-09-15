import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateExamCommand } from './create-exam.command';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { ExamFactory } from '../../domain/entities/exam.factory';

@Injectable()
export class CreateExamCommandHandler {
    private readonly logger = new Logger(CreateExamCommandHandler.name);

    constructor(
        @Inject(EXAM_REPO) private readonly repo: ExamRepositoryPort ) {}

    async execute(cmd: CreateExamCommand) {
    this.logger.log(`CreateExam: classId=${cmd.classId}, title="${cmd.title}"`);

    const owns = await this.repo.teacherOwnsClass(cmd.classId, cmd.teacherId);
    if (!owns) {
        throw new Error('Acceso no autorizado: la clase no pertenece a este docente');
    }

    const exam = ExamFactory.create({
        title: cmd.title,
        status: cmd.status,
        classId: cmd.classId,
        difficulty: cmd.difficulty,
        attempts: cmd.attempts,
        timeMinutes: cmd.timeMinutes,
        reference: cmd.reference,
    });

    return await this.repo.create(exam);
    }
}
