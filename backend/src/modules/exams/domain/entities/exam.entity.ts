import { Difficulty } from './difficulty.vo';
import { PositiveInt } from './positive-int.vo';
import { DistributionVO } from './distribution.vo';

export type ExamStatus = 'Guardado' | 'Publicado';

export class Exam {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly status: ExamStatus,
    public readonly classId: string,
    public readonly subject: string,
    public readonly difficulty: Difficulty,
    public readonly attempts: PositiveInt,
    public readonly totalQuestions: PositiveInt,
    public readonly timeMinutes: PositiveInt,
    public readonly reference: string | null,
    public readonly mcqCount: number,
    public readonly trueFalseCount: number,
    public readonly openAnalysisCount: number,
    public readonly openExerciseCount: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get distribution(): DistributionVO | null {
    const val = {
      multiple_choice: this.mcqCount,
      true_false: this.trueFalseCount,
      open_analysis: this.openAnalysisCount,
      open_exercise: this.openExerciseCount,
    };
    const sum = Object.values(val).reduce((a, b) => a + b, 0);
    if (sum !== this.totalQuestions.getValue()) return null;
    try {
      return new DistributionVO(val, sum);
    } catch {
      return null;
    }
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      status: this.status,
      classId: this.classId,

      subject: this.subject,
      difficulty: this.difficulty.getValue(),
      attempts: this.attempts.getValue(),
      totalQuestions: this.totalQuestions.getValue(),
      timeMinutes: this.timeMinutes.getValue(),
      reference: this.reference,

      mcqCount: this.mcqCount,
      trueFalseCount: this.trueFalseCount,
      openAnalysisCount: this.openAnalysisCount,
      openExerciseCount: this.openExerciseCount,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
