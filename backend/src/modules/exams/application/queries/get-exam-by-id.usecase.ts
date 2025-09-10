import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { EXAM_REPO, EXAM_QUESTION_REPO, SAVED_EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { ExamQuestionRepositoryPort } from '../../domain/ports/exam-question.repository.port';
import type { SavedExamRepositoryPort } from '../../domain/ports/saved-exam.repository.port';
import { NotFoundError, UnauthorizedError } from 'src/shared/handler/errors';

export type GetExamByIdQuery = { examId: string; teacherId: string };

@Injectable()
export class GetExamByIdUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
        @Inject(EXAM_QUESTION_REPO) private readonly questionRepo: ExamQuestionRepositoryPort,
        @Inject(SAVED_EXAM_REPO) private readonly savedRepo: SavedExamRepositoryPort,
    ) {}

    async execute(q: GetExamByIdQuery) {
    // SavedExam binds examId to a teacher and course (ownership)
        const saved = await this.savedRepo.findByExamId(q.examId);
        if (!saved) throw new NotFoundError('Examen no encontrado');
        if (saved.teacherId !== q.teacherId) throw new UnauthorizedError('Acceso no autorizado');

    const exam = await this.examRepo.findById(q.examId);
        if (!exam) throw new NotFoundError('Examen no encontrado');

    const questions = await this.questionRepo.listByExam(q.examId);

    const raw = typeof (exam as any).toJSON === 'function' ? (exam as any).toJSON() : exam as any;
    const distribution =
        'mcqCount' in raw ||
        'trueFalseCount' in raw ||
        'openAnalysisCount' in raw ||
        'openExerciseCount' in raw
    ? {
        multiple_choice: raw.mcqCount ?? 0,
        true_false: raw.trueFalseCount ?? 0,
        open_analysis: raw.openAnalysisCount ?? 0,
        open_exercise: raw.openExerciseCount ?? 0,
    }
    : null;

    // JSON ready for FE
    const base = exam.toJSON();
        return {
            id: exam.id,
            title: saved.title,
            date: saved.createdAt,
            status: saved.status,         // Guardado | Publicado
            subject: base.subject,
            difficulty: base.difficulty,
            totalQuestions: base.totalQuestions,
            timeMinutes: base.timeMinutes,
            reference: base.reference ?? null,
            distribution,
            questions: questions.map(q => ({
                id: q.id,
                kind: q.kind,                // MCQ | TRUE_FALSE | OPEN_ANALYSIS | OPEN_EXERCISE
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
