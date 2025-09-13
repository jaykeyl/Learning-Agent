import { randomUUID } from 'crypto';
import { Exam } from './exam.entity';
import { Difficulty } from './difficulty.vo';
import { PositiveInt } from './positive-int.vo';
import { DomainError } from './domain-error';
import { DistributionVO, type Distribution } from './distribution.vo';

export type ExamProps = {
  subject: string;
  difficulty: string;
  attempts: number;
  totalQuestions: number;
  timeMinutes: number;
  reference?: string | null;
  distribution?: Distribution;
};

export class ExamFactory {
  static create(props: ExamProps): Exam {
    const subject = props.subject?.trim();
    if (!subject) throw new DomainError('Materia (subject) es obligatoria y no puede estar vacía.');

    const reference = props.reference?.trim();
    if (reference && /[<>]/.test(reference)) {
      throw new DomainError('Referencia contiene caracteres no permitidos.');
    }
    if (props.timeMinutes < 45 || props.timeMinutes > 240) {
      throw new DomainError('Tiempo (minutos) debe estar entre 45 y 240.');
    } 

    const difficulty = Difficulty.create(props.difficulty);
    const attempts = PositiveInt.create('Intentos', props.attempts);
    const total = PositiveInt.create('Total de preguntas', props.totalQuestions);
    const time = PositiveInt.create('Tiempo (min)', props.timeMinutes);

    let distributionVO: DistributionVO | null = null;
    if (props.distribution) {
      try {
        distributionVO = new DistributionVO(props.distribution, total.getValue());
      } catch (e: any) {
        throw new DomainError(e?.message ?? 'Distribución inválida.');
      }
    }

    return new Exam(
      randomUUID(),
      subject,
      difficulty,
      attempts,
      total,
      time,
      reference ?? null,
      distributionVO,      
      new Date(),
      new Date(),            
    );
  }
}