import { Controller, Get, Post } from '@nestjs/common';
import { GenerateOptionsForQuestionUseCase } from '../../application/usecases/generate-options-for-question.usecase';

@Controller('exams-chat')
export class ExamsChatController {
  constructor(private readonly generateOptionsUseCase: GenerateOptionsForQuestionUseCase) {}

  @Get('generate-options')
  async generateOptionsGet() {
    return this.generateOptionsUseCase.execute();
  }

  @Post('generate-options')
  async generateOptionsPost() {
    return this.generateOptionsUseCase.execute();
  }
}