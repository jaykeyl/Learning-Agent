import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';

import { ChatRequest } from './dto/chat-request';
import { DEEPSEEK_PORT } from 'src/modules/deepseek/tokens';
import type { DeepseekPort } from 'src/modules/deepseek/domain/ports/deepseek.port';
import { ChatResponse } from 'src/modules/deepseek/domain/ports/response';

@Controller('chat')
export class ChatController {
  constructor(
    @Inject(DEEPSEEK_PORT)
    private readonly deepseekPort: DeepseekPort,
  ) {}

  @Post()
  @HttpCode(200)
  async chatWithIA(@Body() dto: ChatRequest): Promise<ChatResponse> {
    console.log('pregunta recibida', dto);
    const response = await this.deepseekPort.generateResponse(dto.question);
    return response;
  }
}
