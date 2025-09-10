import { BadRequestException, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AddExamQuestionCommand } from './add-exam-question.command';
import { EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';

@Injectable()
export class AddExamQuestionCommandHandler {
  constructor(
    @Inject(EXAM_QUESTION_REPO) private readonly repo: ExamQuestionRepositoryPort,
  ) {}
  private readonly logger = new Logger(AddExamQuestionCommandHandler.name);

  async execute(cmd: AddExamQuestionCommand) {
    const { examId, position, question } = cmd;
    this.logger.log(`execute -> examId=${examId}, position=${position}, kind=${question.kind}`);

    if (!(await this.repo.existsExam(examId))) {
      this.logger.warn(`execute x exam not found id=${examId}`);
      throw new NotFoundException('Exam not found');
    }

    this.validateQuestion(question);
    const created = await this.repo.addToExam(examId, question, position);
    this.logger.log(`execute <- created question id=${created.id} order=${created.order}`);
    return created;
  }

  private validateQuestion(q: any) {
    const allowed = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ANALYSIS', 'OPEN_EXERCISE'];
    if (!allowed.includes(q.kind)) {
      throw new BadRequestException(`Unsupported kind. Allowed: ${allowed.join(', ')}`);
    }
    if (!q.text || typeof q.text !== 'string' || q.text.trim().length < 5) {
      throw new BadRequestException('Question text is required (min 5 chars).');
    }

    if (q.kind === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8) {
        throw new BadRequestException('MCQ requires 2..8 options.');
      }
      if (typeof q.correctOptionIndex !== 'number') {
        throw new BadRequestException('MCQ requires correctOptionIndex.');
      }
      if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        throw new BadRequestException('correctOptionIndex out of range.');
      }
    }

    if (q.kind === 'TRUE_FALSE' && typeof q.correctBoolean !== 'boolean') {
      throw new BadRequestException('TRUE_FALSE requires correctBoolean (true|false).');
    }

    if ((q.kind === 'OPEN_ANALYSIS' || q.kind === 'OPEN_EXERCISE') && q.expectedAnswer != null) {
      if (typeof q.expectedAnswer !== 'string') {
        throw new BadRequestException('expectedAnswer must be a string if provided.');
      }
    }
  }
}
