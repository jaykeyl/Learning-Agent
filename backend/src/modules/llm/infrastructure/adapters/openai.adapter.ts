import { Injectable } from '@nestjs/common';
import { LlmPort, LlmGenOptions, LlmTextOutput, LlmMessage, } from '../../domain/ports/llm.port';
import * as fs from 'fs/promises';
import * as path from 'path';

type ChatChoice = {
  index: number;
  finish_reason?: string;
  message?: { role: string; content?: string | Array<{ type: string; text?: string }> };
};

@Injectable()
export class OpenAiAdapter implements LlmPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly templatesDir: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
    if (!this.apiKey) throw new Error('OPENAI_API_KEY is required');
    this.baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    this.defaultTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 20000);
    this.templatesDir = path.resolve(process.cwd(), process.env.PROMPT_TPL_DIR ?? 'templates');
  }

  private pickModel(options?: LlmGenOptions) {
    return (
      options?.model?.name ||
      process.env.LLM_MODEL ||
      process.env.AI_MODEL ||
      'gpt-4o-mini'
    );
  }
  private pickTemp(options?: LlmGenOptions) {
    return options?.temperature ?? Number(process.env.AI_TEMPERATURE ?? 0.2);
  }
  private pickMax(options?: LlmGenOptions) {
    return options?.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1024);
  }

  private async request(pathname: string, body: any, timeoutMs?: number) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs ?? this.defaultTimeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${pathname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error?.message === 'string'
            ? data.error.message.slice(0, 300)
            : `HTTP ${res.status}`;
        throw new Error(`OpenAI error: ${msg}`);
      }
      return data;
    } finally {
      clearTimeout(id);
    }
  }

  private extractText(data: any): string {
    const choice: ChatChoice | undefined = data?.choices?.[0];
    const c = choice?.message?.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) {
      const part = c.find((p) => p?.type === 'text');
      if (part?.text) return String(part.text);
    }
    return '';
  }

  async complete(prompt: string, options: LlmGenOptions): Promise<LlmTextOutput> {
    const body = {
      model: this.pickModel(options),
      messages: [{ role: 'user', content: prompt }],
      temperature: this.pickTemp(options),
      max_tokens: this.pickMax(options),
      ...(((options as any)?.vendorOptions?.response_format === 'json') && {
        response_format: { type: 'json_object' },
      }),
    };

    const data = await this.request('/chat/completions', body, (options as any)?.timeoutMs);
    const text = this.extractText(data);
    const total = data?.usage?.total_tokens;
    return { text, tokens: { total }, raw: data };
  }

  async chat(messages: LlmMessage[], options: LlmGenOptions): Promise<LlmTextOutput> {
    const mapped = messages.map((m) => ({ role: m.role, content: m.content }));
    const body = {
      model: this.pickModel(options),
      messages: mapped,
      temperature: this.pickTemp(options),
      max_tokens: this.pickMax(options),
      ...(((options as any)?.vendorOptions?.response_format === 'json') && {
        response_format: { type: 'json_object' },
      }),
    };

    const data = await this.request('/chat/completions', body, (options as any)?.timeoutMs);
    const text = this.extractText(data);
    const total = data?.usage?.total_tokens;
    return { text, tokens: { total }, raw: data };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const input =
      Array.isArray(texts) && texts.length > 1 ? texts : [Array.isArray(texts) ? texts[0] : String(texts)];
    const body = {
      model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      input,
    };
    const data = await this.request('/embeddings', body);
    const vectors = Array.isArray(data?.data) ? data.data.map((d: any) => d?.embedding ?? []) : [[]];
    return vectors;
  }

  async stream?(messages: LlmMessage[] | string, options: LlmGenOptions, onToken: (t: string) => void) {
    const res = await this.chat(
      Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages) }],
      options
    );
    onToken?.(res.text);
    return res;
  }

  async getChatPrompt(userQuestion: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, 'singleQuestion.v1.md');
    const template = await fs.readFile(templatePath, 'utf8').catch(() => '{{user_question}}');
    return template.replace('{{user_question}}', userQuestion);
  }

  async askChatQuestion(userQuestion: string, options: LlmGenOptions) {
    const prompt = await this.getChatPrompt(userQuestion);
    return this.complete(prompt, options);
  }
}