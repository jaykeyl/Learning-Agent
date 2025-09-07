import { Controller, Post, Body, Get, Query, Inject } from '@nestjs/common';
import { QuestionResponse } from './dto/question-response';
import { ChatAnswer } from './dto/generate-advice';
import { DEEPSEEK_PORT } from 'src/modules/deepseek/tokens';
import type { DeepseekPort } from 'src/modules/deepseek/domain/ports/deepseek.port';
import {
  DoubleOptionResponse,
  MultipleSelectionResponse,
} from 'src/modules/deepseek/domain/ports/response';

interface CoachingResponse {
  generated_question: string;
  user_response: string;
  coaching_advice: string;
}

@Controller('chatint')
export class ChatIntController {
  constructor(
    @Inject(DEEPSEEK_PORT)
    private readonly deepseekPort: DeepseekPort,
  ) {}

  @Get('question')
  async generateQuestion(
    @Query('topico') topico: string,
  ): Promise<QuestionResponse> {
    return this.deepseekPort.generateQuestion(topico);
  }

  @Post('advice')
  async generateAdvice(
    @Body() chatAnswer: ChatAnswer,
  ): Promise<CoachingResponse> {
    console.log('answer:', chatAnswer);
    const respDs = await this.deepseekPort.generateAdvise(
      chatAnswer.question,
      chatAnswer.answer,
      chatAnswer.topic,
    );
    return respDs;
  }
  @Get('multipleSelection')
  async generateMultipleSelection(
    @Query('topico') topico: string,
  ): Promise<MultipleSelectionResponse> {
    return this.deepseekPort.generateMultipleSelection(topico);
  }
  @Get('doubleOption')
  async generateDoubleOption(
    @Query('topico') topico: string,
  ): Promise<DoubleOptionResponse> {
    return this.deepseekPort.generatedoubleOption(topico);
  }
}
