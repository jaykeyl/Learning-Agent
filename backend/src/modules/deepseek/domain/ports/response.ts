export interface AdviceResponse {
  generated_question: string;
  user_response: string;
  coaching_advice: string;
}

export interface QuestionResponse {
  question: string;
}

export interface ChatResponse {
  question?: string;
  answer: string;
  explanatio?: string;
}
