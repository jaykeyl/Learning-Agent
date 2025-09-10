import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AiConfigService } from '../../core/ai/ai.config';
import { LlmModule } from '../llm/llm.module';
import { ChatController } from './infrastructure/http/chat.controller';
import { DeepseekModule } from '../deepseek/deepseek.module';

@Module({
  imports: [PrismaModule, LlmModule, DeepseekModule],
  controllers: [ChatController],
  providers: [
    // persistencia
    //{ provide: EXAM_REPO, useClass: ExamPrismaRepository },
    // adaptador IA
    AiConfigService,
    //CreateExamCommandHandler,
  ],
})
export class ReinforcementModule {}
