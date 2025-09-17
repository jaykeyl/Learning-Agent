import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ForbiddenError, NotFoundError } from 'src/shared/handler/errors';

import { GetCourseByIdUseCase } from 'src/modules/academic_management/application/queries/get-course-by-id.usecase';
import { GetClassByIdUseCase } from 'src/modules/academic_management/application/queries/get-class-by-id.usecase';

import { GetDocumentsBySubjectUseCase } from 'src/modules/repository_documents/application/queries/get-documents-by-subject.usecase';
import { GetDocumentContentUseCase } from 'src/modules/repository_documents/application/queries/get-document-content.usecase';

export type CourseIndexNode = {
    id: string;
    title: string;
    level: number;
    children?: CourseIndexNode[];
    };

export type GetCourseIndexQuery = {
    courseIdOrClassId: string;
    teacherId: string;
    };

    @Injectable()
    export class GetCourseIndexUseCase {
        private readonly logger = new Logger(GetCourseIndexUseCase.name);

        constructor(
            private readonly moduleRef: ModuleRef,
            private readonly getDocsBySubject: GetDocumentsBySubjectUseCase,
            private readonly getDocContent: GetDocumentContentUseCase,
        ) {}

        async execute(q: GetCourseIndexQuery): Promise<{ nodes: CourseIndexNode[] }> {
            const getCourseById = this.moduleRef.get(GetCourseByIdUseCase, { strict: false });
            const getClassById  = this.moduleRef.get(GetClassByIdUseCase,  { strict: false });

            if (!getCourseById || !getClassById) {
            throw new Error(
                'AcademicManagement use cases not found in container. Ensure they are registered as providers in AcademicManagementModule.'
            );
            }

            const { teacherId } = q;

            const resolvedCourseId = await this.resolveCourseId(q.courseIdOrClassId, getCourseById, getClassById);

            const course = await getCourseById.execute(resolvedCourseId);
            if (!course) throw new NotFoundError('La materia no existe o está inactiva');
            if (course.teacherId !== teacherId) {
            throw new ForbiddenError('No tiene permiso para leer el índice de esta materia');
            }

            const { docs } = await this.getDocsBySubject.execute({
            materiaId: resolvedCourseId,
            tipo: 'pdf',
            page: 1,
            limit: 10,
            });

            const sorted = [...docs].sort((a, b) => {
            const at = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
            const bt = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
            return bt - at;
            });

            for (const d of sorted) {
            try {
                const contentResp = await this.getDocContent.execute({ docId: d.id });
                const text = (contentResp?.contenido || '').trim();
                if (!text) continue;

                const nodes = this.buildIndexTreeFromText(d.id, text);
                if (nodes.length > 0) return { nodes };

                return { nodes: [{ id: `${d.id}#root`, title: d.originalName || 'Contenido', level: 1, children: [] }] };
            } catch {
                continue;
            }
            }

            return { nodes: [] };
        }

        private async resolveCourseId(
            value: string,
            getCourseById: GetCourseByIdUseCase,
            getClassById: GetClassByIdUseCase,
        ): Promise<string> {
            try {
            const c = await getCourseById.execute(value);
            if (c) return c.id;
            } catch { }

            try {
            const cls = await getClassById.execute(value);
            if (cls?.courseId) return cls.courseId;
            } catch { }

            throw new NotFoundError('No se encontró la materia/clase solicitada');
        }

    private buildIndexTreeFromText(docId: string, text: string): CourseIndexNode[] {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const headings: { title: string; level: number; id: string }[] = [];
        const numHeading = /^(\d+(?:\.\d+)*)[)\.\-]?\s+(.+)$/;
        const mdHeading  = /^(#{1,6})\s+(.+)$/;
        const esHeading  = /^(Cap[ií]tulo|Unidad|Tema)\s+(\d+)[\.:]?\s+(.+)$/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            let m = line.match(numHeading);
            if (m) { headings.push({ title: m[2].trim(), level: m[1].split('.').length, id: `${docId}#h${i}` }); continue; }

            m = line.match(mdHeading);
            if (m) { headings.push({ title: m[2].trim(), level: m[1].length, id: `${docId}#h${i}` }); continue; }

            m = line.match(esHeading);
            if (m) { headings.push({ title: `${m[1]} ${m[2]}: ${m[3]}`.trim(), level: 1, id: `${docId}#h${i}` }); continue; }
        }

        if (headings.length === 0) return [];

        const root: CourseIndexNode[] = [];
        const stack: CourseIndexNode[] = [];
        for (const h of headings) {
            const node: CourseIndexNode = { id: h.id, title: h.title, level: h.level, children: [] };

            while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();

            if (stack.length === 0) root.push(node);
            else (stack[stack.length - 1].children ||= []).push(node);

            stack.push(node);
        }

        const normalize = (n: CourseIndexNode) => {
        if (n.children && n.children.length === 0) delete n.children;
            else n.children?.forEach(normalize);
        };
        root.forEach(normalize);
        return root;
        }
}
