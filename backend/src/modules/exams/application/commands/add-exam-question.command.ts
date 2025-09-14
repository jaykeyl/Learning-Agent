import { NewExamQuestion } from '../../domain/entities/exam-question.entity';
import { InsertPosition } from '../../domain/ports/exam-question.repository.port';

export class AddExamQuestionCommand {
  constructor(
    public readonly examId: string,
    public readonly position: InsertPosition,
    public readonly question: NewExamQuestion,
  ) {}
}
