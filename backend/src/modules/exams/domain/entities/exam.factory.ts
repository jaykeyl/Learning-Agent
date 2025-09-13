import { randomUUID } from 'crypto';
import { Exam } from './exam.entity';
import { Difficulty } from './difficulty.vo';
import { PositiveInt } from './positive-int.vo';
import { DomainError } from './domain-error';
import { DistributionVO, type Distribution } from './distribution.vo';

export type ExamProps = {
  title: string;
  status?: 'Guardado' | 'Publicado';
  classId: string;
  subject: string;
  difficulty: string;
  attempts: number;
  totalQuestions: number;
  timeMinutes: number;
  reference?: string | null;
  distribution?: Distribution;
  mcqCount?: number;
  trueFalseCount?: number;
  openAnalysisCount?: number;
  openExerciseCount?: number;
};

export class ExamFactory {
  static create(p: ExamProps): Exam {
    const title = String(p.title ?? '').trim();
    if (!title) throw new DomainError('El título es obligatorio.');
    const classId = String(p.classId ?? '').trim();
    if (!classId) throw new DomainError('classId es obligatorio.');

    const status = (p.status ?? 'Guardado') as 'Guardado' | 'Publicado';
    if (!['Guardado', 'Publicado'].includes(status)) {
      throw new DomainError('status inválido (Guardado|Publicado).');
    }
    if (props.timeMinutes < 45 || props.timeMinutes > 240) {
      throw new DomainError('Tiempo (minutos) debe estar entre 45 y 240.');
    } 

    if (p.timeMinutes < 45 || p.timeMinutes > 240) {
      throw new DomainError('Tiempo (minutos) debe estar entre 45 y 240.');
    } 

    const difficulty = Difficulty.create(p.difficulty);
    const attempts = PositiveInt.create('attempts', p.attempts);
    const total = PositiveInt.create('totalQuestions', p.totalQuestions);
    const time = PositiveInt.create('timeMinutes', p.timeMinutes);
    const reference = p.reference ?? null;

    let mcq = p.mcqCount ?? 0;
    let tf = p.trueFalseCount ?? 0;
    let oa = p.openAnalysisCount ?? 0;
    let oe = p.openExerciseCount ?? 0;

    if (p.distribution) {
      const dist = new DistributionVO(p.distribution, total.getValue());
      mcq = dist.value.multiple_choice;
      tf = dist.value.true_false;
      oa = dist.value.open_analysis;
      oe = dist.value.open_exercise;
    }

    const sum = mcq + tf + oa + oe;
    if (sum !== total.getValue()) {
      throw new DomainError(`La suma de counts (${sum}) debe ser igual a totalQuestions (${total.getValue()}).`);
    }

    return new Exam(
      randomUUID(),
      title,
      status,
      p.classId,
      p.subject,
      difficulty,
      attempts,
      total,
      time,
      reference,
      mcq,
      tf,
      oa,
      oe,
      new Date(),
      new Date(),
    );
  }
}
