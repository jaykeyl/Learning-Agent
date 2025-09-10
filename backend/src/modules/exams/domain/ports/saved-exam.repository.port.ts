export interface SaveApprovedExamInput {
  title: string;
  content: any;
  courseId: string;
  teacherId: string;
  status?: 'Guardado' | 'Publicado';
}

export interface SavedExamDTO {
  id: number;
  title: string;
  content: any;
  status: 'Guardado' | 'Publicado';
  courseId: string;
  teacherId: string;
  createdAt: Date;
  source?: 'saved' | 'hardcoded';
}

export type SavedExamStatus = 'Guardado' | 'Publicado';

export type SavedExamReadModel = {
  id: number;
  title: string;
  content: unknown; 
  status: SavedExamStatus;  
  courseId: string;
  teacherId: string;
  createdAt: Date;
  examId: string | null; 
};

export interface SavedExamRepositoryPort {
  save(data: SaveApprovedExamInput): Promise<SavedExamDTO>;
  listByCourse(courseId: string, teacherId?: string): Promise<SavedExamDTO[]>;
  findByExamId(examId: string): Promise<SavedExamReadModel | null>;
}