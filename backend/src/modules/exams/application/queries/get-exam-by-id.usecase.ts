import { Inject, Injectable } from '@nestjs/common';
import { EXAM_REPO, EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import { NotFoundError } from 'src/shared/handler/errors';

export type GetExamByIdQuery = { examId: string; teacherId: string };

@Injectable()
export class GetExamByIdUseCase {
    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
        @Inject(EXAM_QUESTION_REPO) private readonly questionRepo: ExamQuestionRepositoryPort,
    ) {}

    async execute(q: GetExamByIdQuery) {
        const exam = await this.examRepo.findByIdOwned(q.examId, q.teacherId);
        if (!exam) {
            throw new NotFoundError('Examen no encontrado');
        }

        const questions = await this.questionRepo.listByExamOwned(q.examId, q.teacherId);
        const counts = await this.questionRepo.countsByExamOwned(q.examId, q.teacherId);

        const distribution = exam.distribution
        ? {
            multiple_choice: counts.mcqCount,
            true_false: counts.trueFalseCount,
            open_analysis: counts.openAnalysisCount,
            open_exercise: counts.openExerciseCount,
            }
        : null;
        const toCorrectAnswer = (q: any): boolean | number | null => {
            if (q.kind === 'MULTIPLE_CHOICE') return Number.isInteger(q.correctOptionIndex) ? q.correctOptionIndex : null;
            if (q.kind === 'TRUE_FALSE') return typeof q.correctBoolean === 'boolean' ? q.correctBoolean : null;
            return null; 
        };

        return {
        id: exam.id,
        title: exam.title,
        status: exam.status,
        classId: exam.classId,

        subject: exam.subject,
        difficulty: exam.difficulty.getValue ? exam.difficulty.getValue() : exam.difficulty,
        attempts: exam.attempts.getValue ? exam.attempts.getValue() : exam.attempts,
        totalQuestions: counts.totalQuestions,
        timeMinutes: exam.timeMinutes.getValue ? exam.timeMinutes.getValue() : exam.timeMinutes,
        reference: exam.reference,

        mcqCount: counts.mcqCount,
        trueFalseCount: counts.trueFalseCount,
        openAnalysisCount: counts.openAnalysisCount,
        openExerciseCount: counts.openExerciseCount,

        distribution,
        questions: questions.map(q => ({
            id: q.id,
            kind: q.kind,                // MULTIPLE_CHOICE | TRUE_FALSE | OPEN_ANALYSIS | OPEN_EXERCISE
            text: q.text,
            options: q.options ?? null,
            correctAnswer: toCorrectAnswer(q),
            correctOptionIndex: q.correctOptionIndex ?? null,
            correctBoolean: q.correctBoolean ?? null,
            expectedAnswer: q.expectedAnswer ?? null,
            order: q.order,
        })),
        };
    }
}
