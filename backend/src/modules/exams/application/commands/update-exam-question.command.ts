import { UpdateExamQuestionPatch } from '../../domain/ports/exam-question.repository.port';

export class UpdateExamQuestionCommand {
    constructor(
        public readonly questionId: string,
        public readonly patch: UpdateExamQuestionPatch,
    ) {}
}
