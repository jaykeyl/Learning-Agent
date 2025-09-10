import { Module } from '@nestjs/common';
import { DsAdapter } from './infrastructure/ds.adapter';
import { DEEPSEEK_PORT } from './tokens';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';

@Module({
  imports: [PromptTemplateModule],
  providers: [{ provide: DEEPSEEK_PORT, useClass: DsAdapter }],
  exports: [DEEPSEEK_PORT],
})
export class DeepseekModule {}
