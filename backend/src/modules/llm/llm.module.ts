import { Module } from '@nestjs/common';
import { LLM_PORT } from './tokens';
import { OllamaAdapter } from './infrastructure/adapters/ollama.adapter';

const implProvider = {
  provide: LLM_PORT,
  useClass: (() => {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();

    if (provider === 'openai') {
      return require('./infrastructure/adapters/openai.adapter')
        .OpenAiAdapter;
    }

    // (opcional, si quieres dejar gemini activo por env)
    // if (provider === 'gemini') {
    //   return require('./infrastructure/adapters/gemini.adapter')
    //     .GeminiAdapter;
    // }

    return OllamaAdapter;
  })(),
};

@Module({
  providers: [implProvider],
  exports: [LLM_PORT],
})
export class LlmModule {}