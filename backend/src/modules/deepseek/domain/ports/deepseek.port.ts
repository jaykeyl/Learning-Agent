import {
  AdviceResponse,
  ChatResponse,
  DoubleOptionResponse,
  MultipleSelectionResponse,
  QuestionResponse,
} from './response';

export interface DeepseekPort {
  generateResponse(question: string): Promise<ChatResponse>;

  generateQuestion(topico: string): Promise<QuestionResponse>;

  generateAdvise(
    question: string,
    answer: string,
    topic: string,
  ): Promise<AdviceResponse>;
  generateMultipleSelection(topico: string): Promise<MultipleSelectionResponse>;
  generatedoubleOption(topico: string): Promise<DoubleOptionResponse>;

  generateMultOptionTest(
    topico: string,
  ): Promise<MultipleSelectionTestResponse>;
}
