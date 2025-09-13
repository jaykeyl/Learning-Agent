import { Exam } from '../entities/exam.entity';

export interface ExamRepositoryPort {
  create(exam: Exam): Promise<Exam>;
  findById(id: string): Promise<Exam | null>;
  approve(id: string): Promise<void>;
}
