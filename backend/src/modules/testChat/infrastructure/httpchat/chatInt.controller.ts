import { Controller, Post, Body, Get, Query, Inject } from '@nestjs/common';
import { QuestionResponse } from './dtoChat/question-response';
import { ChatAnswer } from './dtoChat/generate-advice';
import { DEEPSEEK_PORT } from 'src/modules/deepseek/tokens';
import type { DeepseekPort } from 'src/modules/deepseek/domain/ports/deepseek.port';

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

  // Get a new question
  @Get('question')
  async generateQuestion(
    @Query('topico') topico: string,
  ): Promise<QuestionResponse> {
    return this.deepseekPort.generateQuestion(topico);
  }

  // Get advice for an answer
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
}
