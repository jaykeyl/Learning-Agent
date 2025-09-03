import { AdviceResponse, ChatResponse, QuestionResponse } from './response';

export interface DeepseekPort {
  generateResponse(question: string): Promise<ChatResponse>;

  generateQuestion(topico: string): Promise<QuestionResponse>;

  generateAdvise(
    question: string,
    answer: string,
    topic: string,
  ): Promise<AdviceResponse>;
}
