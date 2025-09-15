import { Inject, Injectable, Logger } from '@nestjs/common';
import { EXAM_AI_GENERATOR, EXAM_REPO } from '../../tokens';
import type { AIQuestionGeneratorPort } from '../../domain/ports/ai-question-generator.port';
import type { ExamRepositoryPort } from '../../domain/ports/exam.repository.port';
import type { Distribution } from '../../domain/entities/distribution.vo';

type Input = {
    teacherId: string;
    subject: string;
    difficulty: 'fácil' | 'medio' | 'difícil';
    totalQuestions: number;
    reference?: string | null;
    distribution?: Distribution;
    examId?: string;
    classId?: string;
    language?: 'es' | 'en';
    strict?: boolean; 
    };

    type Output = {
    questions: {
        multiple_choice: any[];
        true_false: any[];
        open_analysis: any[];
        open_exercise: any[];
    };
    };

    @Injectable()
    export class GenerateQuestionsUseCase {
    private readonly logger = new Logger(GenerateQuestionsUseCase.name);

    constructor(
        @Inject(EXAM_REPO) private readonly examRepo: ExamRepositoryPort,
        @Inject(EXAM_AI_GENERATOR)
        private readonly aiGenerator: AIQuestionGeneratorPort,
    ) {}

    async execute(input: Input): Promise<Output> {
        const { teacherId, examId, classId } = input;

        if (examId) {
        const owned = await this.examRepo.findByIdOwned(examId, teacherId);
        if (!owned) throw new Error('Acceso no autorizado: el examen no pertenece a este docente');
        } else if (classId) {
        const owns = await this.examRepo.teacherOwnsClass(classId, teacherId);
        if (!owns) throw new Error('Acceso no autorizado: la clase no pertenece a este docente');
        }

        const flat = await this.aiGenerator.generate({
        subject: input.subject,
        difficulty: input.difficulty,
        totalQuestions: input.totalQuestions,
        distribution: input.distribution,
        reference: input.reference ?? null,
        });

        const grouped = {
        multiple_choice: flat.filter((q: any) => q.type === 'multiple_choice'),
        true_false: flat.filter((q: any) => q.type === 'true_false'),
        open_analysis: flat.filter((q: any) => q.type === 'open_analysis'),
        open_exercise: flat.filter((q: any) => q.type === 'open_exercise'),
        };

        this.logger.log(
        `generated: mcq=${grouped.multiple_choice.length} tf=${grouped.true_false.length} oa=${grouped.open_analysis.length} oe=${grouped.open_exercise.length}`,
        );

        return { questions: grouped };
    }
}
