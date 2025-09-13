import { Exam } from '../entities/exam.entity';

export type ExamStatus = 'Guardado' | 'Publicado';

export interface ExamRepositoryPort {
  create(exam: Exam): Promise<Exam>;
  findByIdOwned(id: string, teacherId: string): Promise<Exam | null>;
  listByClassOwned(classId: string, teacherId: string): Promise<Exam[]>;
  updateMetaOwned(
    id: string,
    teacherId: string,
    patch: Partial<Pick<Exam, 'title' | 'status' | 'classId'>>
  ): Promise<Exam>;
}
