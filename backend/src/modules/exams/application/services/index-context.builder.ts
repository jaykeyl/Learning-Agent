import { Injectable, Logger } from '@nestjs/common';
import { GetDocumentsBySubjectUseCase } from 'src/modules/repository_documents/application/queries/get-documents-by-subject.usecase';
import { GetDocumentContentUseCase } from 'src/modules/repository_documents/application/queries/get-document-content.usecase';
import { HeadingParser } from './heading-parser';

type DocsListLike = { documents?: any[]; docs?: any[]; items?: any[] };
type DocContentLike = { content?: string; contenido?: string };

function pickDocs(resp: DocsListLike): any[] {
    return (resp?.documents ?? resp?.docs ?? resp?.items ?? []) as any[];
}

function pickContent(resp: DocContentLike): string {
    return (resp?.content ?? resp?.contenido ?? '') as string;
}

@Injectable()
export class IndexContextBuilder {
    private readonly logger = new Logger(IndexContextBuilder.name);

    constructor(
        private readonly getDocsBySubject: GetDocumentsBySubjectUseCase,
        private readonly getDocContent: GetDocumentContentUseCase,
    ) {}

    async buildFromIndexIds(courseId: string, indexIds: string[]): Promise<string> {
        const byDoc = new Map<string, number[]>();

        for (const id of indexIds) {
        const [docId, h] = String(id).split('#h');
        const line = Number(h);
        if (!docId || Number.isNaN(line)) continue;
        const arr = byDoc.get(docId) ?? [];
        arr.push(line);
        byDoc.set(docId, arr);
        }

        if (byDoc.size === 0) return '';

        const resp = await this.getDocsBySubject.execute({
        materiaId: courseId,
        page: 1,
        limit: 200,
        tipo: 'pdf',
        });

        const list = pickDocs(resp);
        const allowed = new Set(list.map((d: any) => d.id));

        const chunks: string[] = [];

        for (const [docId, lines] of byDoc.entries()) {
        if (!allowed.has(docId)) {
            this.logger.warn(`Skipping doc ${docId}: not associated to course ${courseId}`);
            continue;
        }

        const docResp = await this.getDocContent.execute({ docId });
        const text = pickContent(docResp).trim();
        if (!text) continue;

        const headings = HeadingParser.parse(text);

        const wanted = Array.from(new Set(lines)).sort((a, b) => a - b);

        for (const ln of wanted) {
            const h = headings.find(x => x.line === ln);
            if (!h) continue;
            const seg = HeadingParser.sliceSection(text, headings, h.line, h.level);
            if (seg) chunks.push(seg);
        }
        }

        return chunks.join('\n\n---\n\n');
    }
}
