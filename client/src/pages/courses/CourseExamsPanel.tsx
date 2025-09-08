import { useEffect, useState } from 'react';
import { Button, Typography, Empty, message } from 'antd';
import { listCourseExams, type CourseExamRow, deleteExamByCandidates } from '../../services/exams.service';
import ExamTable from '../../components/exams/ExamTable';
import { useNavigate } from 'react-router-dom';
import type { ExamSummary } from '../../store/examsStore';

const { Title, Text } = Typography;

type Props = {
  courseId: string;
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

export default function CourseExamsPanel({ courseId }: Props) {
  const [tableData, setTableData] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    listCourseExams(courseId)
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
  }, [courseId]);

  const handleToggleVisibility = async (exam: ExamSummary, next: 'visible' | 'hidden') => {
    setTableData((prev) => prev.map((it) => (it.id === exam.id ? { ...it, visibility: next } : it)));
    message.success(next === 'visible' ? 'Examen hecho público' : 'Examen ocultado');
  };

  const handleDelete = async (exam: ExamSummary) => {
    const prev = tableData;
    setTableData((p) => p.filter((it) => it.id !== exam.id)); 

    try {
      const candidates = Array.isArray((exam as any).__candidates)
        ? (exam as any).__candidates
        : [exam.id];

      await deleteExamByCandidates(courseId, candidates);
      message.success('Examen eliminado');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) {
        message.warning('No se encontró el recurso en el servidor; lo doy por eliminado.');
        return;
      }
      setTableData(prev); 
      const msg = e?.response?.data?.message || e?.message || 'No se pudo eliminar el examen';
      message.error(msg);
    }
  };

  const handleChangeStatus = async (
    exam: ExamSummary,
    mode: 'now' | 'schedule' | 'draft',
    whenIso?: string
  ) => {
    setTableData((prev) =>
      prev.map((it) => {
        if (it.id !== exam.id) return it;
        if (mode === 'now') {
          return { ...it, status: 'published', visibility: 'visible', publishedAt: new Date().toISOString() };
        }
        if (mode === 'schedule') {
          return { ...it, status: 'scheduled', visibility: 'visible', publishedAt: whenIso ?? new Date().toISOString() };
        }
        return { ...it, status: 'draft', publishedAt: undefined };
      })
    );
    if (mode === 'now') message.success('Examen publicado');
    else if (mode === 'schedule') message.success('Examen programado');
    else message.success('Examen guardado como borrador');
  };

  const Header = (
    <div className="flex items-center justify-between mb-2">
      <Title level={4} style={{ margin: 0 }}>Exámenes de esta materia</Title>
      <Button type="primary" onClick={() => navigate(`/exams/create?courseId=${courseId}`)}>
        Crear examen
      </Button>
    </div>
  );

  if (loading && tableData.length === 0) return <div className="mt-4">{Header}</div>;

  return (
    <div className="mt-4">
      {tableData.length > 0 ? (
        <>
          {Header}
          <div id="tabla-examenes-curso">
            <ExamTable
              data={tableData}
              onEdit={() => navigate(`/exams/create?courseId=${courseId}`)}
              onToggleVisibility={handleToggleVisibility}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDelete}
            />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Empty description="Aún no hay exámenes para este curso">
            <Text style={{ fontSize: 14 }}>Los exámenes creados aparecerán aquí para su gestión.</Text>
          </Empty>
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate(`/exams/create?courseId=${courseId}`)}>
            Crear examen
          </Button>
        </div>
      )}
    </div>
  );
}
