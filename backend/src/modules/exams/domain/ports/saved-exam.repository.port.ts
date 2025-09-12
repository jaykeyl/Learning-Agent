export interface SaveSavedExamInput {
  title: string;
  courseId: string;
  teacherId: string;
  examId: string;
  status?: 'Guardado' | 'Publicado';
}

export interface SavedExamDTO {
  id: string;
  title: string;
  status: 'Guardado' | 'Publicado';
  courseId: string;
  teacherId: string;
  createdAt: Date;
  source?: 'saved' | 'hardcoded';
  examId: string; 
}

export type SavedExamStatus = 'Guardado' | 'Publicado';

export type SavedExamReadModel = {
  id: string;
  title: string;
  status: SavedExamStatus;  
  courseId: string;
  teacherId: string;
  createdAt: Date;
  examId: string; 
};

export interface SavedExamRepositoryPort {
  save(data: SaveSavedExamInput): Promise<SavedExamDTO>;
  listByCourse(courseId: string, teacherId?: string): Promise<SavedExamDTO[]>;
  findByExamId(examId: string): Promise<SavedExamReadModel | null>;
}