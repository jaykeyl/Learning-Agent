import { Controller, Get, Query, Inject } from '@nestjs/common';
import { DEEPSEEK_PORT } from 'src/modules/deepseek/tokens';
import type { DeepseekPort } from 'src/modules/deepseek/domain/ports/deepseek.port';
import { MultipleSelectionTestResponse } from 'src/modules/deepseek/domain/ports/response';

@Controller('chatTest')
export class ChatIntController {
  constructor(
    @Inject(DEEPSEEK_PORT)
    private readonly deepseekPort: DeepseekPort,
  ) {}

  @Get('multipleTestSelection')
  async generateMultOptionTest(
    @Query('topico') topico: string,
  ): Promise<MultipleSelectionTestResponse> {
    return this.deepseekPort.generateMultOptionTest(topico);
  }
}
