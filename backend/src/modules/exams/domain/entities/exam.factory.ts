import { randomUUID } from 'crypto';
import { Exam } from './exam.entity';
import { Difficulty } from './difficulty.vo';
import { PositiveInt } from './positive-int.vo';

export type ExamProps = {
  title: string;
  status?: 'Guardado' | 'Publicado';
  classId: string;
  difficulty: string;
  attempts: number;
  timeMinutes: number;
  reference?: string | null;
};

export class ExamFactory {
  static create(p: ExamProps): Exam {
    const id = randomUUID();
    const status = (p.status ?? 'Guardado') as 'Guardado' | 'Publicado';
    const difficulty = Difficulty.create(p.difficulty);
    const attempts = PositiveInt.create('attempts', p.attempts);
    const time = PositiveInt.create('timeMinutes', p.timeMinutes);
    const reference = p.reference ?? null;

    return new Exam(
      id,
      p.title?.trim() || 'Examen',
      status,
      p.classId,
      difficulty,
      attempts,
      time,
      reference,
      new Date(),
      new Date(),
    );
  }
  static rehydrate(raw: {
      id: string;
      title: string;
      status: 'Guardado' | 'Publicado';
      classId: string;
      difficulty: string;
      attempts: number;
      timeMinutes: number;
      reference: string | null;
      createdAt: Date;
      updatedAt: Date;
    }): Exam {
      return Exam.rehydrate(raw);
  }
}
