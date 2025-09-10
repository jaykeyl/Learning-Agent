import type { SavedExamDTO } from '../../../domain/ports/saved-exam.repository.port';

export interface CourseExamsProvider {
  list(courseId: string): Promise<SavedExamDTO[]>;
}

export class SimpleCourseExamsProvider implements CourseExamsProvider {
  async list(courseId: string): Promise<SavedExamDTO[]> {
    const base: Omit<SavedExamDTO, 'id' | 'createdAt'> = {
      title: 'Examen Demo (hardcoded)',
      content: { sections: [], note: 'hardcoded transitional' },
      status: 'Guardado',
      courseId,
      teacherId: 'hardcoded-teacher',
      source: 'hardcoded',
    };
    return [
      { ...base, id: -1, createdAt: new Date(Date.now() - 86400_000) },
    ];
  }
}