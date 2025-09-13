import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, ForbiddenException, } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { responseSuccess, responseBadRequest, responseForbidden, responseInternalServerError, responseNotFound, } from 'src/shared/handler/http.handler';
import { SaveSavedExamUseCase } from '../../application/commands/save-saved-exam.usecase';
import { ListCourseExamsUseCase } from '../../application/queries/list-course-exams.usecase';
import { GetExamByIdUseCase } from '../../application/queries/get-exam-by-id.usecase';
import * as crypto from 'crypto';

const cid = (req: Request) => req.header('x-correlation-id') ?? crypto.randomUUID();
const pathOf = (req: Request) => (req as any).originalUrl || req.url || '';

@UseGuards(JwtAuthGuard)
@Controller()
export class ApprovedExamsController {
  constructor(
    private readonly saveUseCase: SaveSavedExamUseCase,
    private readonly listUseCase: ListCourseExamsUseCase,
    private readonly getByIdUseCase: GetExamByIdUseCase,
  ) {}

  @Get('courses/:courseId/exams')
  async byCourse(@Param('courseId') courseId: string, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) {
      return responseForbidden('Acceso no autorizado', cid(req), 'Falta token', pathOf(req));
    }

    try {
      const data = await this.listUseCase.execute({ courseId, teacherId: user.sub });
      return responseSuccess(cid(req), data, 'Exámenes del curso', pathOf(req));
    } catch (e: any) {
      const msg = e?.message ?? 'Error listando exámenes';
      return responseInternalServerError('Error interno', cid(req), msg, pathOf(req));
    }
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

}
