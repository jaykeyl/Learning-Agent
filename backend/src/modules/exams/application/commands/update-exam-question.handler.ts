import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UpdateExamQuestionCommand } from './update-exam-question.command';
import { EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';

@Injectable()
export class UpdateExamQuestionCommandHandler {
    constructor(
        @Inject(EXAM_QUESTION_REPO) private readonly qRepo: ExamQuestionRepositoryPort,
    ) {}
    private readonly logger = new Logger(UpdateExamQuestionCommandHandler.name);

    async execute(cmd: UpdateExamQuestionCommand) {
        const { questionId, teacherId, patch } = cmd;
        this.logger.log(`execute -> questionId=${questionId}`);
        const current = await this.qRepo.findByIdOwned(questionId, teacherId);
        if (!current) throw new NotFoundException('Pregunta no encontrada o acceso no autorizado');

        if (patch.options !== undefined && !Array.isArray(patch.options)) {
        throw new BadRequestException('options debe ser un arreglo si se proporciona');
        }
        if (patch.correctOptionIndex != null && typeof patch.correctOptionIndex !== 'number') {
        throw new BadRequestException('correctOptionIndex debe ser un número');
        }
        if (patch.correctBoolean != null && typeof patch.correctBoolean !== 'boolean') {
        throw new BadRequestException('correctBoolean debe ser boolean');
        }
        if (patch.expectedAnswer != null && typeof patch.expectedAnswer !== 'string') {
        throw new BadRequestException('expectedAnswer debe ser string');
        }
        if (patch.text !== undefined && !patch.text.trim()) {
        throw new BadRequestException('text no puede ser vacío si se envía');
        }

        const nextOptions = patch.options ?? current.options ?? null;

        if (nextOptions !== null) {
        if (!Array.isArray(nextOptions) || nextOptions.length < 2 || !nextOptions.every(o => typeof o === 'string' && o.trim().length > 0)) {
            throw new BadRequestException('Para MULTIPLE_CHOICE, options debe tener ≥ 2 strings no vacíos.');
        }
        }

        if (patch.correctOptionIndex != null) {
        if (Array.isArray(nextOptions)) {
            if (patch.correctOptionIndex < 0 || patch.correctOptionIndex >= nextOptions.length) {
            throw new BadRequestException('correctOptionIndex fuera de rango para options.');
            }
        } else {
            if (patch.correctOptionIndex < 0) {
            throw new BadRequestException('correctOptionIndex no puede ser negativo.');
            }
        }
        }

        const updated = await this.qRepo.updateOwned(questionId, teacherId, patch);
        this.logger.log(`execute <- updated question id=${updated.id}`);
        return updated;
    }
}
