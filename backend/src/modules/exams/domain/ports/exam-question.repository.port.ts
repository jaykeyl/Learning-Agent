import { ExamQuestion, NewExamQuestion } from '../entities/exam-question.entity';

export type InsertPosition = 'start' | 'middle' | 'end';

export type UpdateExamQuestionPatch = {
  text?: string;
  options?: any[] | null;
  correctOptionIndex?: number | null;
  correctBoolean?: boolean | null;
  expectedAnswer?: string | null;
};

export type DerivedCounts = {
  totalQuestions: number;
  mcqCount: number;
  trueFalseCount: number;
  openAnalysisCount: number;
  openExerciseCount: number;
};

export interface ExamQuestionRepositoryPort {
  existsExamOwned(examId: string, teacherId: string): Promise<boolean>;

  countByExamOwned(examId: string, teacherId: string): Promise<number>;
  countsByExamOwned(examId: string, teacherId: string): Promise<DerivedCounts>;

  bulkCountsByExamIdsOwned(
    examIds: string[],
    teacherId: string,
  ): Promise<Map<string, DerivedCounts>>;

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