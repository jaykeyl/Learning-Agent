import { ExamQuestion, NewExamQuestion } from '../entities/exam-question.entity';

export type InsertPosition = 'start' | 'middle' | 'end';

export type UpdateExamQuestionPatch = {
  text?: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  expectedAnswer?: string;
};
export interface ExamQuestionRepositoryPort {
  existsExam(examId: string): Promise<boolean>;
  countByExam(examId: string): Promise<number>;
  addToExam(
    examId: string,
    question: NewExamQuestion,
    position: InsertPosition
  ): Promise<ExamQuestion>;

  findById(id: string): Promise<ExamQuestion | null>;
  update(id: string, patch: UpdateExamQuestionPatch): Promise<ExamQuestion>;
  listByExam(examId: string): Promise<ExamQuestion[]>;
}
