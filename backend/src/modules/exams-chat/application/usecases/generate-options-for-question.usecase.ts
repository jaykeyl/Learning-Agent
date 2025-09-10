import { Injectable, Inject } from '@nestjs/common';
import { EXAM_AI_GENERATOR } from '../../tokens';
import { AIQuestionGenerator, GeneratedOptions } from '../../infrastructure/ai/ai-question.generator';
import { v4 as uuidv4 } from 'uuid';

export type GenerateOptionsResult = {
  result: 'options_generated';
  question: string;
  options: string[];
  id: string;
};

@Injectable()
export class GenerateOptionsForQuestionUseCase {
  constructor(@Inject(EXAM_AI_GENERATOR) private readonly aiGenerator: AIQuestionGenerator) {}

  async execute(questionId?: string): Promise<GenerateOptionsResult> {
    const id = questionId ?? uuidv4();
    const random = Math.random();
    const chanceMultiple = 0.7;

    if (random < chanceMultiple) {
      const generatedQuestion = await this.aiGenerator.generateQuestion();
      const aiResult: GeneratedOptions = await this.aiGenerator.generateOptions(generatedQuestion.text);
      const options = aiResult.options.length === 4 ? aiResult.options : ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
      return { result: 'options_generated', question: generatedQuestion.text, options, id };
    } else {
      const generatedQuestion = await this.aiGenerator.generateTrueFalseQuestion();
      return { result: 'options_generated', question: generatedQuestion.text, options: ['Verdadero', 'Falso'], id };
    }
  }
}