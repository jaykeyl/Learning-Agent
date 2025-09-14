import {Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Req, UseGuards, UseFilters, UsePipes, ValidationPipe,Inject } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto';

import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import {
  responseSuccess,
} from 'src/shared/handler/http.handler';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { BadRequestError, ForbiddenError, UnauthorizedError, } from 'src/shared/handler/errors';

import { ExamsErrorFilter } from './filters/exams-error.filter';
import { CreateExamDto } from './dtos/create-exam.dto';
import { GenerateQuestionsDto } from './dtos/generate-questions.dto';
import { AddExamQuestionDto } from './dtos/add-exam-question.dto';
import { UpdateExamQuestionDto } from './dtos/update-exam-question.dto';

import { CreateExamCommand } from '../../application/commands/create-exam.command';
import { CreateExamCommandHandler } from '../../application/commands/create-exam.handler';

import { AddExamQuestionCommand } from '../../application/commands/add-exam-question.command';
import { AddExamQuestionCommandHandler } from '../../application/commands/add-exam-question.handler';

import { UpdateExamQuestionCommand } from '../../application/commands/update-exam-question.command';
import { UpdateExamQuestionCommandHandler } from '../../application/commands/update-exam-question.handler';

import { ListClassExamsUseCase } from '../../application/queries/list-class-exams.usecase';
import { GetExamByIdUseCase } from '../../application/queries/get-exam-by-id.usecase';

import { EXAM_AI_GENERATOR } from '../../tokens';

const cid = (req: Request) => req.header('x-correlation-id') ?? randomUUID();
const pathOf = (req: Request) => (req as any).originalUrl || req.url || '';

function normalizeFromCorrectAnswerForCreate(dto: {
  kind: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ANALYSIS' | 'OPEN_EXERCISE';
  options?: string[];
  correctAnswer?: number | boolean | null;
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  expectedAnswer?: string;
}) {
  if ('correctAnswer' in dto && dto.correctAnswer !== undefined) {
    switch (dto.kind) {
      case 'MULTIPLE_CHOICE':
        return {
          options: dto.options,
          correctOptionIndex: dto.correctAnswer as number,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
      case 'TRUE_FALSE':
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: dto.correctAnswer as boolean,
          expectedAnswer: undefined,
        };
      default: // OPEN_*
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
    }
  }
  return {
    options: dto.options,
    correctOptionIndex: dto.correctOptionIndex,
    correctBoolean: dto.correctBoolean,
    expectedAnswer: dto.expectedAnswer,
  };
}

function normalizeFromCorrectAnswerForUpdate(dto: {
  kind: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ANALYSIS' | 'OPEN_EXERCISE';
  options?: string[];
  correctAnswer?: number | boolean | null;
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  expectedAnswer?: string;
}) {
  if ('correctAnswer' in dto && dto.correctAnswer !== undefined) {
    switch (dto.kind) {
      case 'MULTIPLE_CHOICE':
        return {
          options: dto.options,
          correctOptionIndex: dto.correctAnswer as number,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
      case 'TRUE_FALSE':
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: dto.correctAnswer as boolean,
          expectedAnswer: undefined,
        };
      default: 
        return {
          options: undefined,
          correctOptionIndex: undefined,
          correctBoolean: undefined,
          expectedAnswer: undefined,
        };
    }
  }
  return {
    options: dto.options,
    correctOptionIndex: dto.correctOptionIndex,
    correctBoolean: dto.correctBoolean,
    expectedAnswer: dto.expectedAnswer,
  };
}

@UseGuards(JwtAuthGuard)
@UseFilters(ExamsErrorFilter)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('api')
export class ExamsController {
  private readonly logger = new Logger(ExamsController.name);

  constructor(
    private readonly createExamHandler: CreateExamCommandHandler,
    private readonly addExamQuestionHandler: AddExamQuestionCommandHandler,
    private readonly updateExamQuestionHandler: UpdateExamQuestionCommandHandler,
    private readonly prisma: PrismaService,
    private readonly listClassExams: ListClassExamsUseCase,
    private readonly getByIdUseCase: GetExamByIdUseCase,
    @Inject(EXAM_AI_GENERATOR) private readonly aiGenerator: any,
  ) {}

  @Post('exams')
  @HttpCode(200)
  async create(@Body() dto: CreateExamDto, @Req() req: Request) {
    this.logger?.log?.(
      `[${cid(req)}] createExam -> title=${dto.title}, classId=${dto.classId}, difficulty=${dto.difficulty}, attempts=${dto.attempts}, time=${dto.timeMinutes}`,
    );

    if (!dto.title?.trim()) {
      throw new BadRequestError('title es obligatorio.');
    }
    if (!dto.classId?.trim()) {
      throw new BadRequestError('classId es obligatorio.');
    }

    const userId = (req as any).user?.sub as string;
    const owns = await this.prisma.classes.count({
      where: { id: dto.classId, course: { teacherId: userId } },
    });
    if (!owns) {
      throw new ForbiddenError('Acceso no autorizado: la clase no pertenece a este docente');
    }

    const cmd = new CreateExamCommand(
      dto.title,
      dto.classId,
      dto.difficulty,
      dto.attempts,
      dto.timeMinutes,
      dto.reference ?? null,
      dto.status ?? 'Guardado',
    );

    const exam = await this.createExamHandler.execute(cmd);

    this.logger?.log?.(`[${cid(req)}] createExam <- created exam id=${exam.id}`);
    return responseSuccess(cid(req), exam, 'Examen creado exitosamente', pathOf(req));
  }

  @Post('exams/questions')
  @HttpCode(200)
  async generate(@Body() dto: GenerateQuestionsDto, @Req() req: Request) {
    this.logger.log(
      `[${cid(req)}] generateQuestions -> subject=${dto.subject}, difficulty=${dto.difficulty}, total=${dto.totalQuestions}`,
    );

    if (!dto.subject?.trim()) {
      throw new BadRequestError('subject es obligatorio.');
    }
    if (dto.totalQuestions == null || dto.totalQuestions <= 0) {
      throw new BadRequestError('totalQuestions debe ser > 0.');
    }

    const userId = (req as any).user?.sub as string;

    if (dto.examId) {
      const ownsExam = await this.prisma.exam.count({
        where: { id: dto.examId, class: { is: { course: { teacherId: userId } } } },
      });
      if (!ownsExam) {
        throw new ForbiddenError('Acceso no autorizado: el examen no pertenece a este docente');
      }
    } else if (dto.classId) {
      const ownsClass = await this.prisma.classes.count({
        where: { id: dto.classId, course: { teacherId: userId } },
      });
      if (!ownsClass) {
        throw new ForbiddenError('Acceso no autorizado: la clase no pertenece a este docente');
      }
    }

    const flat: any[] = await this.aiGenerator.generate({
      subject: dto.subject,
      difficulty: dto.difficulty,
      totalQuestions: dto.totalQuestions,
      distribution: dto.distribution ?? undefined,
      reference: dto.reference ?? null,
      language: (dto as any).language ?? 'es',
      strict: (dto as any).strict ?? true,
      examId: dto.examId,
      classId: dto.classId,
    });

    const grouped = {
      multiple_choice: flat.filter((q: any) => q.type === 'multiple_choice'),
      true_false: flat.filter((q: any) => q.type === 'true_false'),
      open_analysis: flat.filter((q: any) => q.type === 'open_analysis'),
      open_exercise: flat.filter((q: any) => q.type === 'open_exercise'),
    };

    this.logger.log(
      `[${cid(req)}] generateQuestions <- generated counts mcq=${grouped.multiple_choice.length}, tf=${grouped.true_false.length}, oa=${grouped.open_analysis.length}, oe=${grouped.open_exercise.length}`,
    );

    return responseSuccess(cid(req), { questions: grouped }, 'Preguntas generadas', pathOf(req));
  }

  @Post('exams/:examId/questions')
  @HttpCode(200)
  async addQuestion(
    @Param('examId') examId: string,
    @Body() dto: AddExamQuestionDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      `[${cid(req)}] addQuestion -> examId=${examId}, kind=${dto.kind}, position=${dto.position}`,
    );

    const userId = (req as any).user?.sub as string;
    const owns = await this.prisma.exam.count({
      where: { id: examId, class: { is: { course: { teacherId: userId } } } },
    });
    if (!owns) {
      throw new ForbiddenError('Acceso no autorizado: el examen no pertenece a este docente');
    }

    const bad = (msg: string) => {
      throw new BadRequestError(msg);
    };

    if (!dto.text?.trim()) bad('text es obligatorio.');
    if (!['start', 'middle', 'end'].includes(dto.position)) {
      bad("position debe ser uno de: 'start' | 'middle' | 'end'.");
    }

    const norm = normalizeFromCorrectAnswerForCreate(dto);

    switch (dto.kind) {
      case 'MULTIPLE_CHOICE': {
        const opts = (norm.options ?? dto.options) as string[];
        if (!Array.isArray(opts) || opts.length < 2 || !opts.every((o) => typeof o === 'string' && o.trim())) {
          return bad('Para MULTIPLE_CHOICE, options debe tener ≥ 2 strings no vacíos.');
        }
        if (
          typeof norm.correctOptionIndex !== 'number' ||
          norm.correctOptionIndex < 0 ||
          norm.correctOptionIndex >= opts.length
        ) {
          return bad('correctOptionIndex (o correctAnswer) fuera de rango.');
        }
        break;
      }
      case 'TRUE_FALSE':
        if (typeof norm.correctBoolean !== 'boolean')
          return bad('Para TRUE_FALSE, correctBoolean (o correctAnswer) debe ser boolean.');
        break;
      case 'OPEN_ANALYSIS':
      case 'OPEN_EXERCISE':
        if (norm.expectedAnswer !== undefined && norm.expectedAnswer !== null && !norm.expectedAnswer.trim()) {
          return bad('expectedAnswer no puede estar vacío al enviar.');
        }
        break;
      default:
        return bad('kind inválido.');
    }

    const cmd = new AddExamQuestionCommand(examId, userId, dto.position, {
      kind: dto.kind,
      text: dto.text,
      options: dto.kind === 'MULTIPLE_CHOICE' ? ((norm.options ?? dto.options) as string[]) : undefined,
      correctOptionIndex: norm.correctOptionIndex,
      correctBoolean: norm.correctBoolean,
      expectedAnswer: norm.expectedAnswer,
    });

    const created = await this.addExamQuestionHandler.execute(cmd);

    this.logger.log(`[${cid(req)}] addQuestion <- created question id=${created.id} order=${created.order}`);
    return responseSuccess(cid(req), created, 'Pregunta añadida con éxito', pathOf(req));
  }

  @Put('exams/questions/:questionId')
  @HttpCode(200)
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamQuestionDto,
    @Req() req: Request,
  ) {
    this.logger.log(`[${cid(req)}] updateQuestion -> questionId=${questionId}`);

    if (
      dto.text === undefined &&
      dto.options === undefined &&
      dto.correctOptionIndex === undefined &&
      dto.correctBoolean === undefined &&
      dto.expectedAnswer === undefined &&
      (dto as any).correctAnswer === undefined
    ) {
      throw new BadRequestError('Debe enviar al menos un campo para actualizar.');
    }

    const teacherId = (req as any).user?.sub as string;

    const norm = normalizeFromCorrectAnswerForUpdate(dto);

    const cmd = new UpdateExamQuestionCommand(questionId, teacherId, {
      text: dto.text,
      options: dto.options !== undefined ? dto.options : (norm.options as string[] | undefined),
      correctOptionIndex: norm.correctOptionIndex ?? undefined,
      correctBoolean: norm.correctBoolean ?? undefined,
      expectedAnswer: norm.expectedAnswer ?? undefined,
    });

    const updated = await this.updateExamQuestionHandler.execute(cmd);
    this.logger.log(`[${cid(req)}] updateQuestion <- id=${updated.id}`);
    return responseSuccess(cid(req), updated, 'Pregunta editada correctamente', pathOf(req));
  }

  @Get('exams/:examId')
  @HttpCode(200)
  async getExamById(@Param('examId') examId: string, @Req() req: Request) {
    this.logger.log(`[${cid(req)}] getExamById -> examId=${examId}`);

    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) {
      throw new UnauthorizedError('Acceso no autorizado');
    }
    if (!examId?.trim()) {
      throw new BadRequestError('examId es obligatorio.');
    }

    const data = await this.getByIdUseCase.execute({ examId, teacherId: user.sub });
    this.logger.log(`[${cid(req)}] getExamById <- id=${data.exam.id}`);
    return responseSuccess(cid(req), data, 'Examen recuperado', pathOf(req));
  }

  @Get('classes/:classId/exams')
  @HttpCode(200)
  async byClass(@Param('classId') classId: string, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) {
      throw new UnauthorizedError('Acceso no autorizado');
    }
    if (!classId?.trim()) {
      throw new BadRequestError('classId es obligatorio.');
    }

    const data = await this.listClassExams.execute({ classId, teacherId: user.sub });
    return responseSuccess(cid(req), data, 'Exámenes de la clase', pathOf(req));
  }

  @Get('health/db')
  @HttpCode(200)
  async healthDb() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, db: 'up' };
  }
}
