import {Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Req, UseGuards, ForbiddenException, } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto'; 

import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import {responseBadRequest, responseForbidden, responseInternalServerError, responseNotFound, responseSuccess,} from 'src/shared/handler/http.handler';
import { PrismaService } from 'src/core/prisma/prisma.service';

import { CreateExamDto } from './dtos/create-exam.dto';
import { GenerateQuestionsDto } from './dtos/generate-questions.dto';
import { AddExamQuestionDto } from './dtos/add-exam-question.dto';
import { UpdateExamQuestionDto } from './dtos/update-exam-question.dto';
import { PatchExamMetaDTO } from './dtos/exam.dto';
import { UpsertQuestionsDTO } from './dtos/exam-question.dto';

import { CreateExamCommand, CreateExamCommandHandler } from '../../application/commands/create-exam.command';
import { GenerateQuestionsCommand, GenerateQuestionsCommandHandler } from '../../application/commands/generate-questions.command';
import { AddExamQuestionCommand } from '../../application/commands/add-exam-question.command';
import { AddExamQuestionCommandHandler } from '../../application/commands/add-exam-question.handler';
import { UpdateExamQuestionCommand } from '../../application/commands/update-exam-question.command';
import { UpdateExamQuestionCommandHandler } from '../../application/commands/update-exam-question.handler';

import { ListClassExamsUseCase } from '../../application/queries/list-class-exams.usecase';
import { GetExamByIdUseCase } from '../../application/queries/get-exam-by-id.usecase';


const cid = (req: Request) => req.header('x-correlation-id') ?? randomUUID();
const pathOf = (req: Request) => (req as any).originalUrl || req.url || '';

function sumDistribution(d?: { multiple_choice: number; true_false: number; open_analysis: number; open_exercise: number; }) {
  if (!d) return 0;
  return (d.multiple_choice ?? 0)
      + (d.true_false ?? 0)
      + (d.open_analysis ?? 0)
      + (d.open_exercise ?? 0);
}

@UseGuards(JwtAuthGuard)
@Controller('api')
export class ExamsController {
  constructor(
    private readonly createExamHandler: CreateExamCommandHandler,
    private readonly generateQuestionsHandler: GenerateQuestionsCommandHandler,
    private readonly addExamQuestionHandler: AddExamQuestionCommandHandler,
    private readonly updateExamQuestionHandler: UpdateExamQuestionCommandHandler,
    private readonly prisma: PrismaService,
    private readonly listClassExams: ListClassExamsUseCase,
    private readonly getByIdUseCase: GetExamByIdUseCase,
  ) {}
  private readonly logger = new Logger(ExamsController.name);

@Post('exams')
@HttpCode(200)
async create(@Body() dto: CreateExamDto, @Req() req: Request) {
  this.logger?.log?.(
    `[${cid(req)}] createExam -> title=${dto.title}, classId=${dto.classId}, subject=${dto.subject}, difficulty=${dto.difficulty}, total=${dto.totalQuestions}, time=${dto.timeMinutes}`
  );

  const sum =
    (dto.distribution?.multiple_choice ?? 0) +
    (dto.distribution?.true_false ?? 0) +
    (dto.distribution?.open_analysis ?? 0) +
    (dto.distribution?.open_exercise ?? 0);

  if (!dto.title?.trim()) {
    return responseBadRequest('title es obligatorio.', cid(req), 'Error en validacion', pathOf(req));
  }
  if (!dto.classId?.trim()) {
    return responseBadRequest('classId es obligatorio.', cid(req), 'Error en validacion', pathOf(req));
  }
  if (dto.totalQuestions <= 0) {
    return responseBadRequest('totalQuestions debe ser > 0.', cid(req), 'Error en validacion', pathOf(req));
  }
  if (dto.distribution && sum !== dto.totalQuestions) {
    return responseBadRequest('La suma de distribution debe ser igual a totalQuestions.', cid(req), 'Error en validación', pathOf(req));
  }

  const userId = (req as any).user?.sub as string;
  const owns = await this.prisma.classes.count({
    where: { id: dto.classId, course: { teacherId: userId } }, 
  });
  if (!owns) {
    throw new ForbiddenException('Acceso no autorizado: la clase no pertenece a este docente');
  }
  const cmd = new CreateExamCommand(
    dto.title,
    dto.classId,                        
    dto.subject,
    dto.difficulty,
    dto.attempts,
    dto.totalQuestions,
    dto.timeMinutes,
    dto.reference ?? null,
    dto.distribution ?? undefined,
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
    `[${cid(req)}] generateQuestions -> subject=${dto.subject}, difficulty=${dto.difficulty}, total=${dto.totalQuestions}`
  );

  const sum = sumDistribution(dto.distribution);
  if (!dto.subject?.trim()) {
    return responseBadRequest('subject es obligatorio.', cid(req), 'Error en validacion', pathOf(req));
  }
  if (dto.totalQuestions <= 0) {
    return responseBadRequest('totalQuestions debe ser > 0.', cid(req), 'Error en validacion', pathOf(req));
  }
  if (dto.distribution && sum !== dto.totalQuestions) {
    return responseBadRequest(
      'La suma de distribution debe ser igual a totalQuestions.',
      cid(req),
      'Error en validación',
      pathOf(req)
    );
  }

  const userId = (req as any).user?.sub as string;

if (dto.examId) {
  const ownsExam = await this.prisma.exam.count({
    where: { id: dto.examId, class: { is: { course: { teacherId: userId } } } },
  });
  if (!ownsExam) {
    return responseForbidden(
      'Acceso no autorizado: el examen no pertenece a este docente',
      cid(req),
      'Acceso denegado',
      pathOf(req),
    );
  }
}

else if (dto.classId) {
  const ownsClass = await this.prisma.classes.count({
    where: { id: dto.classId, course: { teacherId: userId } },
  });
  if (!ownsClass) {
    return responseForbidden(
      'Acceso no autorizado: la clase no pertenece a este docente',
      cid(req),
      'Acceso denegado',
      pathOf(req),
    );
  }
}
  
  const genCmd = new GenerateQuestionsCommand(
    dto.subject,
    dto.difficulty,
    dto.totalQuestions,
    dto.reference ?? null,
    dto.distribution ?? undefined,
  );

  const flat = await this.generateQuestionsHandler.execute(genCmd);

  const grouped = {
    multiple_choice: flat.filter((q: any) => q.type === 'multiple_choice'),
    true_false:      flat.filter((q: any) => q.type === 'true_false'),
    open_analysis:   flat.filter((q: any) => q.type === 'open_analysis'),
    open_exercise:   flat.filter((q: any) => q.type === 'open_exercise'),
  };

  this.logger.log(
    `[${cid(req)}] generateQuestions <- generated counts mcq=${grouped.multiple_choice.length}, tf=${grouped.true_false.length}, oa=${grouped.open_analysis.length}, oe=${grouped.open_exercise.length}`
  );

  return responseSuccess(cid(req), { questions: grouped }, 'Examen generado exitosamente', pathOf(req));
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
    return responseForbidden(
      'Acceso no autorizado: el examen no pertenece a este docente',
      cid(req),
      'Acceso denegado',
      pathOf(req),
    );
  }

  const bad = (msg: string) =>
    responseBadRequest(msg, cid(req), 'Error en validacion', pathOf(req));

  if (!dto.text?.trim()) return bad('text es obligatorio.');
  if (!['start', 'middle', 'end'].includes(dto.position)) {
    return bad("position debe ser uno de: 'start' | 'middle' | 'end'.");
  }
  switch (dto.kind) {
    case 'MULTIPLE_CHOICE': {
      const opts = dto.options;
      if (!Array.isArray(opts) || opts.length < 2 || !opts.every(o => typeof o === 'string' && o.trim())) {
        return bad('Para MULTIPLE_CHOICE, options debe tener ≥ 2 strings no vacios.');
      }
      if (
        typeof dto.correctOptionIndex !== 'number' ||
        dto.correctOptionIndex < 0 ||
        dto.correctOptionIndex >= opts.length
      ) {
        return bad('correctOptionIndex fuera de rango.');
      }
      break;
    }
    case 'TRUE_FALSE':
      if (typeof dto.correctBoolean !== 'boolean') return bad('Para TRUE_FALSE, correctBoolean debe ser boolean.');
      break;
    case 'OPEN_ANALYSIS':
    case 'OPEN_EXERCISE':
      if (dto.expectedAnswer !== undefined && dto.expectedAnswer !== null && !dto.expectedAnswer.trim()) {
        return bad('expectedAnswer no puede estar vacío al enviar.');
      }
      break;
    default:
      return bad('kind inválido.');
  }

  const cmd = new AddExamQuestionCommand(
    examId,
    userId,
    dto.position,
    {
      kind: dto.kind,
      text: dto.text,
      options: dto.options,
      correctOptionIndex: dto.correctOptionIndex,
      correctBoolean: dto.correctBoolean,
      expectedAnswer: dto.expectedAnswer,
    },
  );

  const created = await this.addExamQuestionHandler.execute(cmd);

  this.logger.log(
    `[${cid(req)}] addQuestion <- created question id=${created.id} order=${created.order}`,
  );
  return responseSuccess(cid(req), created, 'Pregunta anadida con exito', pathOf(req));
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
    dto.expectedAnswer === undefined
  ) {
    return responseBadRequest(
      'Debe enviar al menos un campo para actualizar.',
      cid(req),
      'Error en validacion',
      pathOf(req),
    );
  }

  const teacherId = (req as any).user?.sub as string;
  const cmd = new UpdateExamQuestionCommand(questionId, teacherId, {
    text: dto.text,
    options: dto.options,
    correctOptionIndex: dto.correctOptionIndex,
    correctBoolean: dto.correctBoolean,
    expectedAnswer: dto.expectedAnswer,
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
    return responseForbidden('Acceso no autorizado', cid(req), 'Falta token', pathOf(req));
  }
  if (!examId?.trim()) {
    return responseBadRequest('examId es obligatorio.', cid(req), 'Error en validación', pathOf(req));
  }

  try {
    const data = await this.getByIdUseCase.execute({ examId, teacherId: user.sub });

    if (!data) {
      return responseNotFound('Examen no encontrado', cid(req), 'Examen no encontrado', pathOf(req));
    }

    this.logger.log(`[${cid(req)}] getExamById <- id=${data.id}`);
    return responseSuccess(cid(req), data, 'Examen recuperado', pathOf(req));
  } catch (e: any) {
    const msg = (e?.message ?? '').toString();
    if (msg.includes('Acceso no autorizado')) {
      return responseForbidden('Acceso no autorizado', cid(req), msg, pathOf(req));
    }
    if (msg.includes('Examen no encontrado')) {
      return responseNotFound('Examen no encontrado', cid(req), msg, pathOf(req));
    }
    return responseInternalServerError('Error interno', cid(req), msg || 'Error obteniendo examen', pathOf(req));
  }
}


@Get('classes/:classId/exams')
@HttpCode(200)
async byClass(@Param('classId') classId: string, @Req() req: Request) {
  const user = (req as any).user as { sub: string } | undefined;
  if (!user?.sub) {
    return responseForbidden('Acceso no autorizado', cid(req), 'Falta token', pathOf(req));
  }
  if (!classId?.trim()) {
    return responseBadRequest('classId es obligatorio.', cid(req), 'Error en validacion', pathOf(req));
  }

  try {
    const data = await this.listClassExams.execute({ classId, teacherId: user.sub });
    return responseSuccess(cid(req), data, 'Examenes de la clase', pathOf(req));
  } catch (e: any) {
    const msg = (e?.message ?? 'Error listando examenes').toString();
    if (msg.includes('Acceso no autorizado')) {
      return responseForbidden('Acceso no autorizado', cid(req), msg, pathOf(req));
    }
    return responseInternalServerError('Error interno', cid(req), msg, pathOf(req));
  }
}



    // @Post('exams/generate-exam')
  // async generateExam(@Body() dto: GenerateExamInput, @Req() req: Request) {
  //   this.logger.log(`[${cid(req)}] generateExam -> templateId=${dto.templateId}, subject=${dto.subject}, level=${dto.level}, numQuestions=${dto.numQuestions}`);
  //   const exam = await this.generateExamHandler.execute(dto);
  //   this.logger.log(`[${cid(req)}] generateExam <- provider=${exam.provider}, model=${exam.model}, outputLength=${exam.output?.length ?? 0}`);
  //   return responseSuccess(cid(req), exam, 'Exam generated successfully', pathOf(req));
  // }
}
