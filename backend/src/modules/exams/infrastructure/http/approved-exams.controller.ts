import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, ForbiddenException, } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { responseSuccess, responseBadRequest, responseForbidden, responseInternalServerError, } from 'src/shared/handler/http.handler';
import { SaveApprovedExamDto } from './dtos/save-approved-exam.dto';
import { SaveApprovedExamUseCase } from '../../application/commands/save-approved-exam.usecase';
import { ListCourseExamsUseCase } from '../../application/queries/list-course-exams.usecase';

const cid = (req: Request) => req.header('x-correlation-id') ?? crypto.randomUUID();
const pathOf = (req: Request) => (req as any).originalUrl || req.url || '';

@UseGuards(JwtAuthGuard)
@Controller()
export class ApprovedExamsController {
  constructor(
    private readonly saveUseCase: SaveApprovedExamUseCase,
    private readonly listUseCase: ListCourseExamsUseCase,
  ) {}

  @Post('exams/approved')
  async save(@Body() dto: SaveApprovedExamDto, @Req() req: Request) {
    const user = (req as any).user as { sub: string } | undefined;
    if (!user?.sub) {
      return responseForbidden('Acceso no autorizado', cid(req), 'Falta token', pathOf(req));
    }

    try {
      const saved = await this.saveUseCase.execute({
        title: dto.title,
        content: dto.content,
        courseId: dto.courseId,
        status: dto.status ?? 'Guardado',
        teacherId: user.sub,
      });
      return responseSuccess(cid(req), saved, 'Examen guardado', pathOf(req));
    } catch (e: any) {
      const msg = e?.message ?? 'Error guardando examen';
      if (e instanceof ForbiddenException || msg.includes('autorizado')) {
        return responseForbidden('Acceso no autorizado', cid(req), msg, pathOf(req));
      }
      if (e instanceof BadRequestException || msg.includes('Datos inválidos')) {
        return responseBadRequest('Datos inválidos', cid(req), msg, pathOf(req));
      }
      return responseInternalServerError('Error interno', cid(req), msg, pathOf(req));
    }
  }

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
}
