import { Inject, Injectable } from '@nestjs/common';
import { EXAM_REPO, EXAM_QUESTION_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';

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
        throw new Error('Examen no encontrado o acceso no autorizado');
        }

        const questions = await this.questionRepo.listByExamOwned(q.examId, q.teacherId);

        const distribution = exam.distribution
        ? {
            multiple_choice: exam.mcqCount,
            true_false: exam.trueFalseCount,
            open_analysis: exam.openAnalysisCount,
            open_exercise: exam.openExerciseCount,
            }
        : null;

        return {
        id: exam.id,
        title: exam.title,
        status: exam.status,
        classId: exam.classId,

        subject: exam.subject,
        difficulty: exam.difficulty.getValue ? exam.difficulty.getValue() : exam.difficulty,
        attempts: exam.attempts.getValue ? exam.attempts.getValue() : exam.attempts,
        totalQuestions: exam.totalQuestions.getValue ? exam.totalQuestions.getValue() : exam.totalQuestions,
        timeMinutes: exam.timeMinutes.getValue ? exam.timeMinutes.getValue() : exam.timeMinutes,
        reference: exam.reference,

        mcqCount: exam.mcqCount,
        trueFalseCount: exam.trueFalseCount,
        openAnalysisCount: exam.openAnalysisCount,
        openExerciseCount: exam.openExerciseCount,

        distribution,
        questions: questions.map(q => ({
            id: q.id,
            kind: q.kind,                // MULTIPLE_CHOICE | TRUE_FALSE | OPEN_ANALYSIS | OPEN_EXERCISE
            text: q.text,
            options: q.options ?? null,
            correctOptionIndex: q.correctOptionIndex ?? null,
            correctBoolean: q.correctBoolean ?? null,
            expectedAnswer: q.expectedAnswer ?? null,
            order: q.order,
        })),
        };
    }
}
