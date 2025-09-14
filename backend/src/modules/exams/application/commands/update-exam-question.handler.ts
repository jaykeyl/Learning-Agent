import { BadRequestException, Inject, Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { UpdateExamQuestionCommand } from './update-exam-question.command';
import { EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';

@Injectable()
export class UpdateExamQuestionCommandHandler {
    private readonly logger = new Logger(UpdateExamQuestionCommandHandler.name);

    constructor(
        @Inject(EXAM_QUESTION_REPO)
        private readonly qRepo: ExamQuestionRepositoryPort,
    ) {}

    async execute(cmd: UpdateExamQuestionCommand) {
        const { questionId, teacherId, patch } = cmd;
        this.logger.log(`UpdateQuestion: questionId=${questionId}`);

        const current = await this.qRepo.findByIdOwned(questionId, teacherId);
        if (!current) {
        throw new NotFoundException('Question not found or not owned by teacher.');
        }

        if (patch.text !== undefined && !String(patch.text).trim()) {
        throw new BadRequestException('text cannot be empty when provided.');
        }

        const kind = (patch as any).kind ?? current.kind;

        if (kind === 'MULTIPLE_CHOICE') {
        if (patch.options) {
            const opts = patch.options;
            if (opts.length < 2) {
            throw new BadRequestException('MCQ requires at least two options.');
            }
            if (patch.correctOptionIndex != null) {
            const idx = patch.correctOptionIndex;
            if (idx < 0 || idx >= opts.length) {
                throw new BadRequestException(
                'correctOptionIndex out of range for provided options.',
                );
            }
            }
        } else if (patch.correctOptionIndex != null) {
            const optsLen = current.options?.length ?? 0;
            if (
            optsLen === 0 ||
            patch.correctOptionIndex < 0 ||
            patch.correctOptionIndex >= optsLen
            ) {
            throw new BadRequestException(
                'correctOptionIndex out of range for existing options.',
            );
            }
        }
        }

        if (kind === 'TRUE_FALSE') {
        if (
            patch.correctBoolean != null &&
            typeof patch.correctBoolean !== 'boolean'
        ) {
            throw new BadRequestException('correctBoolean must be boolean.');
        }
        }

        if (kind === 'OPEN_ANALYSIS' || kind === 'OPEN_EXERCISE') {
        if (
            patch.expectedAnswer !== undefined &&
            !String(patch.expectedAnswer).trim()
        ) {
            throw new BadRequestException(
            'expectedAnswer cannot be empty when provided.',
            );
        }
        }

        const updated = await this.qRepo.updateOwned(questionId, teacherId, patch);
        this.logger.log(`UpdateQuestion: updated id=${updated.id}`);
        return updated;
    }
}
