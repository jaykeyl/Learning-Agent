import {Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Req, UseGuards,} from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'crypto'; 

import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import {responseBadRequest, responseForbidden, responseInternalServerError, responseNotFound, responseSuccess,} from 'src/shared/handler/http.handler';
import { PrismaService } from 'src/core/prisma/prisma.service';

import { CreateExamDto } from './dtos/create-exam.dto';
import { GenerateQuestionsDto } from './dtos/generate-questions.dto';
import { AddExamQuestionDto } from './dtos/add-exam-question.dto';
import { UpdateExamQuestionDto } from './dtos/update-exam-question.dto';

import { CreateExamCommand, CreateExamCommandHandler } from '../../application/commands/create-exam.command';
import { GenerateQuestionsCommand, GenerateQuestionsCommandHandler } from '../../application/commands/generate-questions.command';
import { AddExamQuestionCommand } from '../../application/commands/add-exam-question.command';
import { AddExamQuestionCommandHandler } from '../../application/commands/add-exam-question.handler';
import { UpdateExamQuestionCommand } from '../../application/commands/update-exam-question.command';
import { UpdateExamQuestionCommandHandler } from '../../application/commands/update-exam-question.handler';

import { ListCourseExamsUseCase } from '../../application/queries/list-course-exams.usecase';
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
    private readonly listCourseExams: ListCourseExamsUseCase,
    private readonly getByIdUseCase: GetExamByIdUseCase,
  ) {}
  private readonly logger = new Logger(ExamsController.name);

  @Post('exams')
  @HttpCode(200)
  async create(@Body() dto: CreateExamDto, @Req() req: Request) {
    this.logger.log(`[${cid(req)}] createExam -> subject=${dto.subject}, difficulty=${dto.difficulty}, total=${dto.totalQuestions}, time=${dto.timeMinutes}`);
    const sum = sumDistribution(dto.distribution);
    if (dto.totalQuestions <= 0) {
      return responseBadRequest('totalQuestions debe ser > 0.', cid(req), 'Error en validación', pathOf(req));
    }
    if (sum !== dto.totalQuestions) {
      return responseBadRequest('La suma de distribution debe ser igual a totalQuestions.', cid(req), 'Error en validación', pathOf(req));
    }

    const createCmd = new CreateExamCommand(
      dto.subject,
      dto.difficulty,
      dto.attempts,
      dto.totalQuestions,
      dto.timeMinutes,
      dto.reference ?? null,
      dto.distribution ?? undefined,
    );

    const exam = await this.createExamHandler.execute(createCmd);
    this.logger.log(`[${cid(req)}] createExam <- created exam id=${exam.id}`);
    return responseSuccess(cid(req), exam, 'Exam created successfully', pathOf(req));
  }

  @Post('exams/questions')
  @HttpCode(200)
  async generate(@Body() dto: GenerateQuestionsDto, @Req() req: Request) {
    this.logger.log(`[${cid(req)}] generateQuestions -> subject=${dto.subject}, difficulty=${dto.difficulty}, total=${dto.totalQuestions}`);
    const sum = sumDistribution(dto.distribution);
    if (dto.totalQuestions <= 0) {
      return responseBadRequest('totalQuestions debe ser > 0.', cid(req), 'Error en validación', pathOf(req));
    }
    if (sum !== dto.totalQuestions) {
      return responseBadRequest('La suma de distribution debe ser igual a totalQuestions.', cid(req), 'Error en validación', pathOf(req));
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
      true_false: flat.filter((q: any) => q.type === 'true_false'),
      open_analysis: flat.filter((q: any) => q.type === 'open_analysis'),
      open_exercise: flat.filter((q: any) => q.type === 'open_exercise'),
    };
    this.logger.log(`[${cid(req)}] generateQuestions <- generated counts mcq=${grouped.multiple_choice.length}, tf=${grouped.true_false.length}, oa=${grouped.open_analysis.length}, oe=${grouped.open_exercise.length}`);
    return responseSuccess(cid(req), { questions: grouped }, 'Questions generated successfully', pathOf(req));
  }


  @Post('exams/:examId/questions')
  async addQuestion(
    @Param('examId') examId: string,
    @Body() dto: AddExamQuestionDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      `[${cid(req)}] addQuestion -> examId=${examId}, kind=${dto.kind}, position=${dto.position}`,
    );
    const cmd = new AddExamQuestionCommand(examId, dto.position, {
      kind: dto.kind,
      text: dto.text,
      options: dto.options,
      correctOptionIndex: dto.correctOptionIndex,
      correctBoolean: dto.correctBoolean,
      expectedAnswer: dto.expectedAnswer,
    });
    const created = await this.addExamQuestionHandler.execute(cmd);
    this.logger.log(
      `[${cid(req)}] addQuestion <- created question id=${created.id} order=${created.order}`,
    );
    return responseSuccess(cid(req), created, 'Question added to exam', pathOf(req));
  }

  @Put('exams/questions/:questionId')
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateExamQuestionDto,
    @Req() req: Request,
  ) {
    this.logger.log(`[${cid(req)}] updateQuestion -> questionId=${questionId}`);
    const updated = await this.updateExamQuestionHandler.execute(
      new UpdateExamQuestionCommand(questionId, dto),
    );
    this.logger.log(`[${cid(req)}] updateQuestion <- id=${updated.id}`);
    return responseSuccess(cid(req), updated, 'Question updated successfully', pathOf(req));
  }

  @Get('/exams/:examId')
  async getExamById(@Param('examId') examId: string, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) {
      return responseForbidden('Acceso no autorizado', cid(req), 'Falta token', pathOf(req));
    }

    try {
      const data = await this.getByIdUseCase.execute({ examId, teacherId: user.sub });
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

    @Get('courses/:courseId/exams')
  async byCourse(@Param('courseId') courseId: string, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) {
      return responseForbidden('Acceso no autorizado', cid(req), 'Falta token', pathOf(req));
    }

    try {
      const data = await this.listCourseExams.execute({ courseId, teacherId: user.sub });
      return responseSuccess(cid(req), data, 'Exámenes del curso', pathOf(req));
    } catch (e: any) {
      const msg = e?.message ?? 'Error listando exámenes';
      return responseInternalServerError('Error interno', cid(req), msg, pathOf(req));
    }
  }

  @Post('/exams/quick-save')
  @HttpCode(200)
  async quickSave(@Body() body: any, @Req() req: Request) {
    const c = cid(req);
    const title = String(body?.title ?? 'Examen');

    let courseId: number | string | undefined = body?.courseId;
    let teacherId: string | undefined = body?.teacherId;

    if (!courseId) {
      const firstCourse = await this.prisma.course.findFirst({
        select: { id: true, teacherId: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstCourse) {
        return responseBadRequest(
          'No hay courseId y no existe ningún Curso en la base. Crea un curso o envía courseId.',
          c,
          'Bad Request',
          pathOf(req),
        );
      }
      courseId = firstCourse.id; 
      if (!teacherId && firstCourse.teacherId) teacherId = String(firstCourse.teacherId);
    }

    const rawQuestions =
      Array.isArray(body?.questions)
        ? body.questions
        : Array.isArray(body?.content?.questions)
        ? body.content.questions
        : [];

    const used = new Set<string>();
    const ts = Date.now();
    const questions = rawQuestions.map((q: any, i: number) => {
      const t = String(q?.type ?? 'open_analysis');
      let id = String(q?.id ?? `q_${ts}_${t}_${i}`);
      while (used.has(id)) id = `${id}_${Math.random().toString(36).slice(2,6)}`;
      used.add(id);
      return {
        id,
        type: t,
        text: String(q?.text ?? ''),
        options: Array.isArray(q?.options) ? q.options.map(String) : undefined,
      };
    });

    const content =
      body?.content && typeof body.content === 'object'
        ? body.content
        : {
            subject: String(body?.subject ?? 'Tema general'),
            difficulty: String(body?.difficulty ?? 'medio'),
            createdAt: new Date().toISOString(),
            questions,
          };

    const data: any = {
      title,
      status: 'Guardado',
      content,
      courseId,                         
      ...(teacherId ? { teacherId } : {}),
    };

    const saved = await this.prisma.savedExam.create({ data });
    return responseSuccess(c, { id: saved.id, title: saved.title }, 'Quick exam saved', pathOf(req));
  }

    // @Post('exams/generate-exam')
  // async generateExam(@Body() dto: GenerateExamInput, @Req() req: Request) {
  //   this.logger.log(`[${cid(req)}] generateExam -> templateId=${dto.templateId}, subject=${dto.subject}, level=${dto.level}, numQuestions=${dto.numQuestions}`);
  //   const exam = await this.generateExamHandler.execute(dto);
  //   this.logger.log(`[${cid(req)}] generateExam <- provider=${exam.provider}, model=${exam.model}, outputLength=${exam.output?.length ?? 0}`);
  //   return responseSuccess(cid(req), exam, 'Exam generated successfully', pathOf(req));
  // }
}
