import { Injectable } from '@nestjs/common';
import { LlmPort, LlmGenOptions, LlmTextOutput, LlmMessage, } from '../../domain/ports/llm.port';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class GeminiAdapter implements LlmPort {
  private client: GoogleGenerativeAI;
  private templatesDir: string;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.templatesDir = path.resolve(process.cwd(), process.env.PROMPT_TPL_DIR ?? 'templates');
  }

  private pickModel(options?: LlmGenOptions) {
    return (
      options?.model?.name ||
      process.env.LLM_MODEL ||
      process.env.AI_MODEL ||
      'gemini-2.0-flash-exp'
    );
  }
  private pickTemp(options?: LlmGenOptions) {
    return options?.temperature ?? Number(process.env.AI_TEMPERATURE ?? 0.2);
  }
  private pickMax(options?: LlmGenOptions) {
    return options?.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1024);
  }

  async complete(prompt: string, options: LlmGenOptions): Promise<LlmTextOutput> {
    const model = this.client.getGenerativeModel({
      model: this.pickModel(options),
      generationConfig: {
        temperature: this.pickTemp(options),
        maxOutputTokens: this.pickMax(options),
        ...((options as any)?.vendorOptions?.response_format === 'json'
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    });
    const resp = await model.generateContent(prompt);
    const text = resp.response?.text?.() ?? '';
    const total =
      (resp.response as any)?.usageMetadata?.totalTokenCount ??
      (resp.response as any)?.usageMetadata?.totalTokens;
    return { text, tokens: { total }, raw: resp };
  }

  async chat(messages: LlmMessage[], options: LlmGenOptions): Promise<LlmTextOutput> {
    const sys = messages.find((m) => m.role === 'system')?.content;
    const model = this.client.getGenerativeModel({
      model: this.pickModel(options),
      ...(sys ? { systemInstruction: sys } : {}),
      generationConfig: {
        temperature: this.pickTemp(options),
        maxOutputTokens: this.pickMax(options),
        ...((options as any)?.vendorOptions?.response_format === 'json'
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    });
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', parts: [{ text: m.content }]}));

    const resp = await model.generateContent({ contents });
    const text = resp.response?.text?.() ?? '';
    const total =
      (resp.response as any)?.usageMetadata?.totalTokenCount ??
      (resp.response as any)?.usageMetadata?.totalTokens;
    return { text, tokens: { total }, raw: resp };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const embedModel = this.client.getGenerativeModel({
      model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    });
    const input = Array.isArray(texts) ? texts.join('\n\n') : String(texts);
    const result = await embedModel.embedContent(input);
    const vec = (result as any)?.embedding?.values ?? [];
    return [vec];
  }

  async stream?(messages: LlmMessage[] | string, options: LlmGenOptions, onToken: (t: string) => void) {
    const res = await this.chat(
      Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
      options
    );
    onToken?.(res.text);
    return res;
  }

  async getChatPrompt(userQuestion: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, 'singleQuestion.v1.md');
    const template = await fs.readFile(templatePath, 'utf8');
    return template.replace('{{user_question}}', userQuestion);
  }

  async askChatQuestion(userQuestion: string, options: LlmGenOptions) {
    const prompt = await this.getChatPrompt(userQuestion);
    return this.complete(prompt, options);
  }
}