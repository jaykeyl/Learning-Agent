export interface GeneratedOptions {
  options: string[];
  correctIndex?: number | null;
  confidence?: number | null;
}

export interface GeneratedQuestion {
  text: string;
}

export interface OptionGeneratorPort {
  generateOptions(text: string): Promise<GeneratedOptions>;
  generateQuestion?(topic?: string): Promise<GeneratedQuestion>;
}