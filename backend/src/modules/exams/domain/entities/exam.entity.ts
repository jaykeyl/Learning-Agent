import { Difficulty } from '../entities/difficulty.vo';
import { PositiveInt } from '../entities/positive-int.vo';
import { DistributionVO } from './distribution.vo'; 

export class Exam {
  constructor(
    public readonly id: string,
    public readonly subject: string,
    public readonly difficulty: Difficulty,
    public readonly attempts: PositiveInt,
    public readonly totalQuestions: PositiveInt,
    public readonly timeMinutes: PositiveInt,
    public readonly reference: string | null,
    public readonly distribution: DistributionVO | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly approvedAt?: Date,
  ) {}
  
  toJSON() {
    const base = {
      id: this.id,
      subject: this.subject,
      difficulty: this.difficulty.getValue?.() ?? String(this.difficulty),
      attempts: this.attempts.getValue?.() ?? Number(this.attempts),
      totalQuestions: this.totalQuestions.getValue?.() ?? Number(this.totalQuestions),
      timeMinutes: this.timeMinutes.getValue?.() ?? Number(this.timeMinutes),
      reference: this.reference,
      createdAt: this.createdAt ?? null,
      updatedAt: this.updatedAt,
      approvedAt: this.approvedAt ?? null,
    };

    if (this.distribution) {
      return {
        ...base,
        distribution: {
          multiple_choice: this.distribution.value.multiple_choice,
          true_false: this.distribution.value.true_false,
          open_analysis: this.distribution.value.open_analysis,
          open_exercise: this.distribution.value.open_exercise,
        },
      };
    }

    return base;
  }
}