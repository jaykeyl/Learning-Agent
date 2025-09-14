import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ApproveExamCommand } from './approve-exam.command';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';

@Injectable()
export class ApproveExamCommandHandler {
    constructor(@Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort) {}
    private readonly logger = new Logger(ApproveExamCommandHandler.name);

    async execute(cmd: ApproveExamCommand) {
        this.logger.log(`execute -> examId=${cmd.examId}`);
        const exam = await this.examRepo.findById(cmd.examId);
        if (!exam) throw new NotFoundException('Exam not found');
        await this.examRepo.approve(cmd.examId);
        this.logger.log(`execute <- approved examId=${cmd.examId}`);
        return { ok: true };
    }
}
