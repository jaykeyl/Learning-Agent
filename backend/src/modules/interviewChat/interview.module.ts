import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AiConfigService } from '../../core/ai/ai.config';
import { LlmModule } from '../llm/llm.module';
import { ChatIntController } from './infrastructure/http/chatInt.controller';
import { DeepseekModule } from '../deepseek/deepseek.module';

@Module({
  imports: [PrismaModule, LlmModule, DeepseekModule],
  controllers: [ChatIntController],
  providers: [AiConfigService],
})
export class InterviewModule {}
