import { PROMPT_TEMPLATE_PORT } from 'src/modules/prompt-template/tokens';
import { DeepseekPort } from '../domain/ports/deepseek.port';
import type { PromptTemplatePort } from 'src/modules/prompt-template/domain/ports/prompt-template.port';
import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AdviceResponse,
  ChatResponse,
  QuestionResponse,
  MultipleSelectionResponse,
  DoubleOptionResponse,
} from '../domain/ports/response';

@Injectable()
export class DsAdapter implements DeepseekPort {
  private deepseek: OpenAI;
  constructor(
    @Inject(PROMPT_TEMPLATE_PORT)
    private readonly promptTemplatePort: PromptTemplatePort,
  ) {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || 'your-api-key-here',
      baseURL: 'https://api.deepseek.com/v1',
    });
  }
  async generateResponse(question: string): Promise<ChatResponse> {
    try {
      const vars: Record<string, string> = {
        user_question: question,
      };
      const prompt = await this.promptTemplatePort.render(
        'singleQuestion.v1',
        vars,
      );
      console.log(prompt);
      const completion = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are an academic assistant that always responds in a strict JSON format according to the provided instructions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 1.3,
        max_tokens: 500,
      });

      return JSON.parse(
        completion.choices[0]?.message?.content ||
          '{"answer":"No response from AI"}',
      ) as ChatResponse;
    } catch (error) {
      console.error('OpenAI Error:', error);
      throw new Error('Error generating AI response');
    }
  }
  async generateQuestion(topico: string): Promise<QuestionResponse> {
    try {
      const vars: Record<string, string> = {
        topico: topico,
      };
      const prompt = await this.promptTemplatePort.render('interview.v1', vars);
      const completion = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are an assistant that always responds in strict JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 150,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const response = JSON.parse(responseContent) as QuestionResponse;
      return response;
    } catch (error) {
      console.error('OpenAI Error in generateQuestion:', error);
      throw new Error('Error generating question');
    }
  }
  async generateAdvise(
    question: string,
    answer: string,
    topic: string,
  ): Promise<AdviceResponse> {
    try {
      const vars: Record<string, string> = {
        user_question: question,
        user_answer: answer,
        topic: topic,
      };

      const prompt = await this.promptTemplatePort.render(
        'interview-advice.v1',
        vars,
      );
      console.log('mensaje', prompt);
      const completion = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente que siempre responde en formato JSON estricto.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const coachingResponse: AdviceResponse = JSON.parse(
        responseContent,
      ) as AdviceResponse;
      console.log('resp advice', coachingResponse);
      return coachingResponse;
    } catch (error) {
      console.error('OpenAI Error in generateAdvise:', error);
      throw new Error('Error generating AI response');
    }
  }
  async generateMultipleSelection(
    topico: string,
  ): Promise<MultipleSelectionResponse> {
    try {
      const vars: Record<string, string> = {
        topico: topico,
      };
      const prompt = await this.promptTemplatePort.render(
        'interview.multipleSelection.v1',
        vars,
      );
      const completion = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are an assistant that always responds in strict JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      console.log('responseContent:', responseContent);
      if (!responseContent) {
        throw new Error('No response from AI');
      }
      const response = JSON.parse(responseContent) as MultipleSelectionResponse;
      return response;
    } catch (error) {
      console.error('OpenAI Error in generateMultipleSelection:', error);
      throw new Error('Error generating multiple selection and question');
    }
  }
  async generatedoubleOption(topico: string): Promise<DoubleOptionResponse> {
    try {
      const vars: Record<string, string> = {
        topico: topico,
      };
      const prompt = await this.promptTemplatePort.render(
        'interview.doubleOption.v1',
        vars,
      );
      const completion = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are an assistant that always responds in strict JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const responseContent = completion.choices[0]?.message?.content;
      console.log('responseContent:', responseContent);
      if (!responseContent) {
        throw new Error('No response from AI');
      }
      const responseDO = JSON.parse(responseContent) as DoubleOptionResponse;
      return responseDO;
    } catch (error) {
      console.error('OpenAI Error in generateMultipleSelection:', error);
      throw new Error('Error generating multiple selection and question');
    }
  }
}
