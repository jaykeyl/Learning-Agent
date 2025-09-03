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

    GenerateExamUseCase,
    CreateExamCommandHandler,
    GenerateQuestionsCommandHandler,
    AddExamQuestionCommandHandler,
    UpdateExamQuestionCommandHandler,
    ApproveExamCommandHandler,
  ],
  controllers: [ExamsController],
})
export class ExamsModule {}