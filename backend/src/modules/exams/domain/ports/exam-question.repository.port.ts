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
  existsExamOwned(examId: string, teacherId: string): Promise<boolean>;

  countByExamOwned(examId: string, teacherId: string): Promise<number>;

  addToExamOwned(
    examId: string,
    teacherId: string,
    question: NewExamQuestion,
    position: InsertPosition
  ): Promise<ExamQuestion>;

  findByIdOwned(id: string, teacherId: string): Promise<ExamQuestion | null>;

  updateOwned(
    id: string,
    teacherId: string,
    patch: UpdateExamQuestionPatch
  ): Promise<ExamQuestion>;

  listByExamOwned(examId: string, teacherId: string): Promise<ExamQuestion[]>;
}
