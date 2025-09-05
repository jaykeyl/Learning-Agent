import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { EXAM_REPO, EXAM_QUESTION_REPO, EXAM_AI_GENERATOR } from './tokens';
import { ExamPrismaRepository } from './infrastructure/persistence/exam.prisma.repository';
import { ExamsController } from './infrastructure/http/exams.controller';
import { CreateExamCommandHandler } from './application/commands/create-exam.command';
import { GenerateQuestionsCommandHandler } from './application/commands/generate-questions.command';
import { LlmAiQuestionGenerator } from './infrastructure/ai/llm-ai-question.generator';
import { LLM_PORT } from '../llm/tokens';
import { GeminiAdapter } from '../llm/infrastructure/adapters/gemini.adapter';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';
import { GenerateExamUseCase } from './application/commands/generate-exam.usecase';
import { ExamQuestionPrismaRepository } from './infrastructure/persistence/exam-question.prisma.repository';
import { AddExamQuestionCommandHandler } from './application/commands/add-exam-question.handler';
import { UpdateExamQuestionCommandHandler } from './application/commands/update-exam-question.handler';
import { ApproveExamCommandHandler } from './application/commands/approve-exam.handler';
import { SavedExamPrismaRepository } from './infrastructure/persistence/saved-exam.prisma.repository';
import { SaveApprovedExamUseCase } from './application/commands/save-approved-exam.usecase';
import { ListCourseExamsUseCase } from './application/queries/list-course-exams.usecase';
import { SAVED_EXAM_REPO, COURSE_EXAMS_HARDCODED } from './tokens';
import { SimpleCourseExamsProvider } from './infrastructure/http/providers/course-hardcoded-exams.provider';
import { ApprovedExamsController } from './infrastructure/http/approved-exams.controller';
import { TOKEN_SERVICE } from '../identity/tokens';

function decodeJwtPayload(token: string): any {
  const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
  const parts = raw.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');

  let b64url = parts[1].trim();

  b64url = b64url.replace(/[^A-Za-z0-9\-_]/g, '');

  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');

  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);

  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
}
const DevTokenService = {
  verifyAccess: (token: string) => decodeJwtPayload(token),
};

@Module({
  imports: [
    PrismaModule,
    PromptTemplateModule,
  ],
  providers: [
    { provide: EXAM_REPO, useClass: ExamPrismaRepository },
    { provide: EXAM_QUESTION_REPO, useClass: ExamQuestionPrismaRepository },

    GeminiAdapter,
    { provide: LLM_PORT, useExisting: GeminiAdapter },

    { provide: EXAM_AI_GENERATOR, useClass: LlmAiQuestionGenerator },
    { provide: SAVED_EXAM_REPO, useClass: SavedExamPrismaRepository },
    { provide: COURSE_EXAMS_HARDCODED, useClass: SimpleCourseExamsProvider },

    GenerateExamUseCase,
    CreateExamCommandHandler,
    GenerateQuestionsCommandHandler,
    AddExamQuestionCommandHandler,
    UpdateExamQuestionCommandHandler,
    ApproveExamCommandHandler,
    SaveApprovedExamUseCase,
    ListCourseExamsUseCase,
    
    { provide: TOKEN_SERVICE, useValue: DevTokenService },
  ],
  controllers: [ExamsController, ApprovedExamsController],
})
export class ExamsModule {}