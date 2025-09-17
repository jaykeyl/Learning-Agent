import { useEffect, useState } from 'react';
import { Button, Typography, Empty } from 'antd';
import { listClassExams, deleteExamAny, type CourseExamRow } from '../../services/exams.service';
import ExamTable from '../../components/exams/ExamTable';
import type { ExamSummary } from '../../store/examsStore';
import InlineExamCreator from '../exams/InlineExamCreator.tsx';

const { Title, Text } = Typography;

type Props = {
  courseId: string; // subject
  classId: string;  // period
};

function extractIdCandidates(r: any, courseId: string): string[] {
  const vals = new Set<string>();
  const push = (v: any) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    if (s === courseId) return; 
    vals.add(s);
  };

  [
    'id', 'uuid',
    'examId', 'exam_id', 'examUuid', 'exam_uuid',
    'approvedExamId', 'approved_exam_id',
    'approvedId', 'approved_id',
    'publicExamId', 'public_exam_id',
  ].forEach(k => push(r?.[k]));

  ['exam', 'approvedExam', 'approved', 'examen', 'aprobado'].forEach(k => {
    const o = r?.[k];
    if (o && typeof o === 'object') {
      ['id', 'uuid', 'examId', 'approvedExamId'].forEach(kk => push(o?.[kk]));
    }
  });

  Object.keys(r || {}).forEach(k => {
    if (/id$/i.test(k) || /_id$/i.test(k)) push(r[k]);
  });

  return Array.from(vals);
}

export default function CourseExamsPanel({ courseId, classId }: Props) {
  const [tableData, setTableData] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchList = () => {
    if (!classId) return;
    setLoading(true);
    listClassExams(classId)
      .then((rows: CourseExamRow[]) => {
        const mapped: ExamSummary[] = (rows || []).map((r) => {
          const candidates = extractIdCandidates(r as any, courseId);
          const primary = candidates[0] ?? String(r.id);

          return {
            id: primary,
            title: r.title || 'Examen',
            status: r.status === 'Publicado' ? 'published' : 'draft',
            visibility: 'visible',
            createdAt: r.createdAt ?? new Date().toISOString(),
            publishedAt:
              r.status === 'Publicado'
                ? (r.updatedAt ?? r.createdAt ?? new Date().toISOString())
                : undefined,
            totalQuestions: Number((r as any)?.questionsCount ?? 0),
            counts: { multiple_choice: 0, true_false: 0, open_analysis: 0, open_exercise: 0 },
            __candidates: candidates,
          } as any;
        });
        setTableData(mapped);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, [classId, courseId]);

  const Header = (
    <div className="flex items-center justify-between mb-2">
      <Title level={4} style={{ margin: 0 }}>Exámenes de esta materia</Title>
      <Button type="primary" onClick={() => setCreateOpen(true)}>
        Crear examen
      </Button>
    </div>
  );

  if (loading && tableData.length === 0) return <div className="mt-4">{Header}</div>;

  return (
    <div className="mt-4">
      {Header}
      {createOpen && (
        <div style={{ marginBottom: 16 }}>
          <InlineExamCreator
            classId={classId}
            courseId={courseId}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              fetchList();
            }}
          />
        </div>
      )}

      {tableData.length > 0 ? (
        <div id="tabla-examenes-curso">
          <ExamTable
            data={tableData}
            disableStatusControls
            onEdit={() => setCreateOpen(true)}
            onDelete={async (id) => {
              await deleteExamAny(id);
              fetchList();
            }}
          />
        </div>
      ) : (
        !createOpen && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Empty description="Aún no hay exámenes para este curso">
            <Text style={{ fontSize: 14 }}>Los exámenes creados aparecerán aquí para su gestión.</Text>
            </Empty>
          </div>
        )
      )}
    </div>
  );
}
