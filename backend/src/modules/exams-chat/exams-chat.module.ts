import { Module } from '@nestjs/common';
import { ExamsChatController } from './infrastructure/http/exams.controller';
import * as AiGenModule from './infrastructure/ai/ai-question.generator';
import { EXAM_AI_GENERATOR } from './tokens';
import { GenerateOptionsForQuestionUseCase } from './application/usecases/generate-options-for-question.usecase';
import { DeepseekModule } from '../deepseek/deepseek.module';

const AiGeneratorClass =
  (AiGenModule as any).AIQuestionGenerator ??
  (AiGenModule as any).AiQuestionGenerator ??
  (AiGenModule as any).default;

class AiGeneratorFallback {
  async generateOptions(_text: string): Promise<string[]> {
    throw new Error('AI generator not available');
  }
}

const AiProvider =
  typeof AiGeneratorClass === 'function'
    ? { provide: EXAM_AI_GENERATOR, useClass: AiGeneratorClass }
    : { provide: EXAM_AI_GENERATOR, useClass: AiGeneratorFallback };

@Module({
  imports: [DeepseekModule],
  controllers: [ExamsChatController],
  providers: [
    AiProvider,
    GenerateOptionsForQuestionUseCase,
  ],
  exports: [AiProvider],
})
export class ExamsChatModule {}
