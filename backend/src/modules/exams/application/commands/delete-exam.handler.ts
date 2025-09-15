import { Inject, Injectable } from '@nestjs/common';
import { DeleteExamCommand } from './delete-exam.command';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';

@Injectable()
export class DeleteExamCommandHandler {
    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
    ) {}

    async execute(cmd: DeleteExamCommand): Promise<void> {
        await this.examRepo.deleteOwned(cmd.examId, cmd.teacherId);
    }
}
