import { BadRequestException, Inject, Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { AddExamQuestionCommand } from './add-exam-question.command';
import { EXAM_REPO, EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type {
  ExamQuestionRepositoryPort,
  InsertPosition,
} from '../../domain/ports/exam-question.repository.port';

@Injectable()
export class AddExamQuestionCommandHandler {
  private readonly logger = new Logger(AddExamQuestionCommandHandler.name);

  constructor(
    @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
    @Inject(EXAM_QUESTION_REPO)
    private readonly qRepo: ExamQuestionRepositoryPort,
  ) {}

  async execute(cmd: AddExamQuestionCommand) {
    const { examId, teacherId, position, question } = cmd;
    this.logger.log(
      `AddQuestion: examId=${examId}, position=${position}, kind=${question.kind}`,
    );

    const exam = await this.examRepo.findByIdOwned(examId, teacherId);
    if (!exam) {
      throw new NotFoundException('Exam not found or not owned by teacher.');
    }

    if (!question.text?.trim()) {
      throw new BadRequestException('Question text is required.');
    }

    if (question.kind === 'MULTIPLE_CHOICE') {
      const opts = question.options ?? [];
      if (opts.length < 2) {
        throw new BadRequestException('MCQ requires at least two options.');
      }
      const idx = question.correctOptionIndex;
      if (idx == null || idx < 0 || idx >= opts.length) {
        throw new BadRequestException('correctOptionIndex out of range.');
      }
    }

    if (
      question.kind === 'TRUE_FALSE' &&
      typeof question.correctBoolean !== 'boolean'
    ) {
      throw new BadRequestException('TRUE_FALSE requires correctBoolean.');
    }

    if (
      (question.kind === 'OPEN_ANALYSIS' ||
        question.kind === 'OPEN_EXERCISE') &&
      !String(question.expectedAnswer ?? '').trim()
    ) {
      throw new BadRequestException(
        `${question.kind} requires expectedAnswer.`,
      );
    }

    const created = await this.qRepo.addToExamOwned(
      examId,
      teacherId,
      question,
      position as InsertPosition,
    );

    this.logger.log(`AddQuestion: created questionId=${created.id}`);
    return created;
  }
}
