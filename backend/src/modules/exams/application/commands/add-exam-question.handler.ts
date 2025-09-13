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
    const { examId, teacherId, position, question } = cmd;
    this.logger.log(`execute -> examId=${examId}, position=${position}, kind=${question.kind}`);

    const exists = await this.repo.existsExamOwned(examId, teacherId);
    if (!exists) throw new NotFoundException('Examen no encontrado o acceso no autorizado');

    this.validateQuestion(question);

    // Optional: you can use count to enforce order bounds if needed
    await this.repo.countByExamOwned(examId, teacherId);

    const created = await this.repo.addToExamOwned(examId, teacherId, question, position);
    this.logger.log(`execute <- created question id=${created.id} order=${created.order}`);
    return created;
  }

  private validateQuestion(q: any) {
    if (!q || typeof q !== 'object') throw new BadRequestException('Pregunta inválida');

    if (typeof q.text !== 'string' || !q.text.trim()) {
      throw new BadRequestException('text es requerido');
    }

    switch (q.kind) {
      case 'MULTIPLE_CHOICE': {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new BadRequestException('MCQ requiere options (≥2)');
        }
        if (typeof q.correctOptionIndex !== 'number') {
          throw new BadRequestException('MCQ requiere correctOptionIndex');
        }
        if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
          throw new BadRequestException('correctOptionIndex fuera de rango');
        }
        break;
      }
      case 'TRUE_FALSE': {
        if (typeof q.correctBoolean !== 'boolean') {
          throw new BadRequestException('TRUE_FALSE requiere correctBoolean');
        }
        break;
      }
      case 'OPEN_ANALYSIS':
      case 'OPEN_EXERCISE': {
        if (q.expectedAnswer != null && typeof q.expectedAnswer !== 'string') {
          throw new BadRequestException('expectedAnswer debe ser string si se provee');
        }
        break;
      }
      default:
        throw new BadRequestException('kind inválido');
    }
  }
}
