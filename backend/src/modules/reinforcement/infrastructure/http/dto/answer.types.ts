export type GenerateAnswerInput = {
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }[];
  options: {
    model: {
      name: string;
      version?: string;
    };
    temperature: number;
    top_p: number;
    max_tokens?: number;
  };
  format?: 'json';
};

export type GeneratedAnswerResult = {
  output: string;
  tokens: {
    total: number;
    prompt?: number;
    completion?: number;
  };
  metadata: {
    provider: string;
    model: string;
    timestamp: Date;
  };
};
