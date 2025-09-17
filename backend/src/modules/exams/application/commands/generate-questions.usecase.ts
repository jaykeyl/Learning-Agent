import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EXAM_AI_GENERATOR, EXAM_REPO } from '../../tokens';
import { IndexContextBuilder } from '../services/index-context.builder';
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
    indexIds?: string[];
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
        @Inject(EXAM_AI_GENERATOR) private readonly aiGenerator: AIQuestionGeneratorPort,
        private readonly indexContextBuilder: IndexContextBuilder,
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

        let finalReference: string | null = input.reference ?? null;

        if (Array.isArray(input.indexIds)) {
        if (input.indexIds.length === 0) {
            throw new BadRequestException(
            'Debe seleccionar al menos un índice o no enviar "indexIds" para usar todo el contenido.',
            );
        }

        const selectedContext = await this.indexContextBuilder.buildFromIndexIds(input.subject, input.indexIds);

        this.logger.log(
            `[gen-questions] context=selected-indexes count=${input.indexIds.length} exam=${examId ?? '-'} class=${classId ?? '-'} teacher=${teacherId}`,
        );

        if (selectedContext && selectedContext.trim().length > 0) {
            const sep = finalReference ? '\n\n=== CONTEXTO SELECCIONADO ===\n' : '=== CONTEXTO SELECCIONADO ===\n';
            finalReference = (finalReference ?? '') + sep + selectedContext;
        }
        } else {
        this.logger.log(
            `[gen-questions] context=all exam=${examId ?? '-'} class=${classId ?? '-'} teacher=${teacherId}`,
        );
    }

    const flat = await this.aiGenerator.generate({
        subject: input.subject,
        difficulty: input.difficulty,
        totalQuestions: input.totalQuestions,
        distribution: input.distribution,
        reference: finalReference,    
    });

    const grouped = {
        multiple_choice: flat.filter((q: any) => q.type === 'multiple_choice'),
        true_false:      flat.filter((q: any) => q.type === 'true_false'),
        open_analysis:   flat.filter((q: any) => q.type === 'open_analysis'),
        open_exercise:   flat.filter((q: any) => q.type === 'open_exercise'),
    };

    this.logger.log(
        `generated: mcq=${grouped.multiple_choice.length} tf=${grouped.true_false.length} oa=${grouped.open_analysis.length} oe=${grouped.open_exercise.length}`,
    );

    return { questions: grouped };
    }
}
