import { BadRequestException, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UpdateExamQuestionCommand } from './update-exam-question.command';
import { EXAM_QUESTION_REPO, EXAM_REPO } from '../../tokens';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';

@Injectable()
export class UpdateExamQuestionCommandHandler {
    constructor(
        @Inject(EXAM_QUESTION_REPO) private readonly qRepo: ExamQuestionRepositoryPort,
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
    ) {}
    private readonly logger = new Logger(UpdateExamQuestionCommandHandler.name);

    async execute(cmd: UpdateExamQuestionCommand) {
        this.logger.log(`execute -> questionId=${cmd.questionId}`);
        const current = await this.qRepo.findById(cmd.questionId);
        if (!current) throw new NotFoundException('Question not found');

        const exam = await this.examRepo.findById(current.examId);
        if (!exam) throw new NotFoundException('Exam not found for question');

        // lock edits if approved, uncomment console line to test
        if (exam.approvedAt) {
            //console.log('exam.approvedAt =', exam.approvedAt); 
            throw new BadRequestException('This exam is already approved. Questions cannot be edited.');
        }

        const patch = cmd.patch;

        if (patch.text != null && !patch.text.trim()) {
        throw new BadRequestException('text must be non-empty');
        }

        const nextOptions = patch.options ?? current.options ?? [];
        switch (current.kind) {
        case 'MULTIPLE_CHOICE': {
            if (!Array.isArray(nextOptions) || nextOptions.length < 2) {
            throw new BadRequestException('multiple_choice requires at least 2 options');
            }
            const idx = patch.correctOptionIndex ?? current.correctOptionIndex ?? 0;
            if (idx < 0 || idx >= nextOptions.length) {
            throw new BadRequestException('correctOptionIndex out of bounds for options');
            }
            break;
        }
        case 'TRUE_FALSE': {
            if (patch.correctBoolean != null && typeof patch.correctBoolean !== 'boolean') {
            throw new BadRequestException('correctBoolean must be true or false');
            }
            break;
        }
        case 'OPEN_ANALYSIS':
        case 'OPEN_EXERCISE': {
            if (patch.expectedAnswer != null && typeof patch.expectedAnswer !== 'string') {
            throw new BadRequestException('expectedAnswer must be a string');
            }
            break;
        }
        }

        const updated = await this.qRepo.update(cmd.questionId, patch);
        this.logger.log(`execute <- updated question id=${updated.id}`);
        return updated;
    }
}
