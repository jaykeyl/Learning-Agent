import { Inject, Injectable } from '@nestjs/common';
import { EXAM_REPO } from '../../tokens';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';

export type ListClassExamsQuery = { classId: string; teacherId: string };

const unwrap = <T>(x: any): T =>
    typeof x?.getValue === 'function' ? x.getValue() : x;

@Injectable()
export class ListClassExamsUseCase {
    constructor(
        @Inject(EXAM_REPO) private readonly repo: ExamRepositoryPort,
    ) {}

    async execute(q: ListClassExamsQuery) {
        const rows = await this.repo.listByClassOwned(q.classId, q.teacherId);

        return rows.map(r => ({
        id: r.id,
        title: r.title,
        status: r.status,
        classId: r.classId,

        subject: r.subject,
        difficulty: unwrap<string>(r.difficulty),
        attempts: unwrap<number>(r.attempts),
        totalQuestions: unwrap<number>(r.totalQuestions),
        timeMinutes: unwrap<number>(r.timeMinutes),
        reference: r.reference,

        mcqCount: r.mcqCount,
        trueFalseCount: r.trueFalseCount,
        openAnalysisCount: r.openAnalysisCount,
        openExerciseCount: r.openExerciseCount,

        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        }));
    }
}
