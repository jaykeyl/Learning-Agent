import { Inject, Injectable } from '@nestjs/common';
import type { AIQuestionGeneratorPort } from '../../domain/ports/ai-question-generator.port';
import { Question, type QuestionType } from '../../domain/entities/question.entity';
import type { Distribution } from '../../domain/entities/distribution.vo';
import { LLM_PORT } from '../../../llm/tokens';
import type { LlmPort } from '../../../llm/domain/ports/llm.port';
import { PROMPT_TEMPLATE_PORT } from '../../../prompt-template/tokens';
import type { PromptTemplatePort } from '../../../prompt-template/domain/ports/prompt-template.port';

function stripFences(text: string): string {
  return text.replace(/```json|```/g, '').trim();
}

function mapRawTypeToQuestionType(raw: unknown): QuestionType {
  const t = String(raw ?? '').trim();
  switch (t) {
    case 'multiple_choice': return 'multiple_choice';
    case 'true_false': return 'true_false';
    case 'open_analysis': return 'open_analysis';
    case 'open_exercise': return 'open_exercise';
    default: return 'open_analysis';
  }
}

function tryParseObject(s: string) { try { return JSON.parse(s); } catch { return null; } }
function tryParseArray(s: string)  { try { const v = JSON.parse(s); return Array.isArray(v) ? v : null; } catch { return null; } }

function parseJsonObjectLenient(text: string): any {
  const cleaned = stripFences(text);
  let obj = tryParseObject(cleaned);
  if (obj) return obj;

  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1) {
    obj = tryParseObject(cleaned.slice(0, lastBrace + 1));
    if (obj) return obj;
  }
  obj = tryParseObject(cleaned.replace(/,\s*([}\]])/g, '$1'));
  if (obj) return obj;

  throw new Error('AI response no es JSON válido (objeto esperado)');
}

function parseJsonArrayLenient(text: string): any[] {
  const cleaned = stripFences(text);
  let arr = tryParseArray(cleaned);
  if (arr) return arr;

  const last = cleaned.lastIndexOf(']');
  if (last !== -1) {
    arr = tryParseArray(cleaned.slice(0, last + 1));
    if (arr) return arr;
  }
  arr = tryParseArray(cleaned.replace(/,\s*([}\]])/g, '$1'));
  if (arr) return arr;

  throw new Error('AI response no es JSON válido (array esperado)');
}

@Injectable()
export class LlmAiQuestionGenerator implements AIQuestionGeneratorPort {
  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    @Inject(PROMPT_TEMPLATE_PORT) private readonly tpl: PromptTemplatePort,
  ) {}

  private mapDifficulty(d: 'fácil' | 'medio' | 'difícil'): 'easy' | 'medium' | 'hard' {
    return d === 'fácil' ? 'easy' : d === 'medio' ? 'medium' : 'hard';
    }
  
  async generate(params: {
    subject: string;
    difficulty: 'fácil' | 'medio' | 'difícil';
    totalQuestions: number;
    reference?: string | null;
    distribution?: Distribution;
  }): Promise<Question[]> {
    const model = {
      provider: (process.env.LLM_PROVIDER ?? 'ollama') as any,
      name: process.env.LLM_MODEL ?? 'gemma3:1b',
    };

    const prompt = await this.tpl.render('exams.generate.v1', {
      subject: params.subject,
      level: this.mapDifficulty(params.difficulty),
      numQuestions: params.totalQuestions,
      reference: params.reference ?? '',
      distribution: params.distribution ?? null,
    });

    const out = await this.llm.complete(prompt, {
      model,
      temperature: Number(process.env.AI_TEMPERATURE ?? 0.2),
      maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 2048),
      vendorOptions: { response_format: 'json' },
    });

    const contentText = out.text?.trim() ?? '';

    if (params.distribution) {
      const obj = parseJsonObjectLenient(contentText);
      const mcq = Array.isArray(obj?.multiple_choice) ? obj.multiple_choice : [];
      const tf  = Array.isArray(obj?.true_false) ? obj.true_false : [];
      const oa  = Array.isArray(obj?.open_analysis) ? obj.open_analysis : [];
      const oe  = Array.isArray(obj?.open_exercise) ? obj.open_exercise : [];

      const mapped = [
        ...mcq.map((q: any) => new Question('multiple_choice', String(q?.text ?? '').trim(), q?.options ?? [])),
        ...tf.map((q: any)  => new Question('true_false', String(q?.text ?? '').trim())),
        ...oa.map((q: any)  => new Question('open_analysis', String(q?.text ?? '').trim())),
        ...oe.map((q: any)  => new Question('open_exercise', String(q?.text ?? '').trim())),
      ];
      return mapped;
    }

    const list = parseJsonArrayLenient(contentText);
    return list.map((q: any) => {
      const type = mapRawTypeToQuestionType(q?.type);
      const text = String(q?.text ?? '').trim();
      const options = type === 'multiple_choice' ? (q?.options ?? []) : null;
      return new Question(type, text, options);
    });
  }
}