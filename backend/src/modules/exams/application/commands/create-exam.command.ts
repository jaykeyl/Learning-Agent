import { Inject, Logger } from '@nestjs/common';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import { ExamFactory } from '../../domain/entities/exam.factory';
import { DistributionVO, type Distribution } from '../../domain/entities/distribution.vo'

export class CreateExamCommand {
  constructor(
    public readonly title: string,
    public readonly classId: string,
    public readonly subject: string,
    public readonly difficulty: string,
    public readonly attempts: number,
    public readonly totalQuestions: number,
    public readonly timeMinutes: number,
    public readonly reference?: string | null,
    public readonly distribution?: Distribution,
    public readonly status?: 'Guardado' | 'Publicado',
  ) {}
}

export class CreateExamCommandHandler {
  private readonly logger = new Logger(CreateExamCommandHandler.name);
  constructor(
    @Inject(EXAM_REPO) private readonly repo: ExamRepositoryPort,
  ) {}

  async execute(command: CreateExamCommand) {
    const distVO = command.distribution
      ? new DistributionVO(command.distribution, command.totalQuestions)
      : null;

    const exam = ExamFactory.create({
      title: command.title,
      status: command.status ?? 'Guardado',
      classId: command.classId,

      subject: command.subject,
      difficulty: command.difficulty,
      attempts: command.attempts,
      totalQuestions: command.totalQuestions,
      timeMinutes: command.timeMinutes,
      reference: command.reference ?? null,

      distribution: distVO?.value,
    });

    this.logger.log(`execute -> creating exam entity id=${exam.id}`);
    const created = await this.repo.create(exam);
    this.logger.log(`execute <- exam persisted id=${created.id}`);
    return created;
  }
}
