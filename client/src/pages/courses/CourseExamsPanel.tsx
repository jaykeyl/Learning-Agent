import { useEffect, useState } from 'react';
import { Button, Typography, Empty } from 'antd';
import { listCourseExams, type CourseExamRow } from '../../services/exams.service';
import ExamTable from '../../components/exams/ExamTable';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

type Props = {
  courseId: string;
};

export default function CourseExamsPanel({ courseId }: Props) {
  const [rows, setRows] = useState<CourseExamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    listCourseExams(courseId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading && rows.length === 0) return null;

  const dataForExamTable = rows.map((r) => ({
    id: String(r.id),
    title: r.title,
    status: r.status === 'Publicado' ? 'published' : 'saved',
    visible: r.status === 'Publicado',
    createdAt: r.createdAt,
    publishedAt: r.status === 'Publicado' ? (r.updatedAt || r.createdAt) : undefined,
    questionsCount: (r as any).questionsCount ?? 0,
  })) as any[];

  return (
    <div className="mt-4">
      {rows.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <Title level={4} style={{ margin: 0 }}>Exámenes de esta materia</Title>
            <Button type="primary" onClick={() => navigate(`/exams/create?courseId=${courseId}`)}>
              Crear examen
            </Button>
          </div>

          <div id="tabla-examenes-curso">
            <ExamTable
              data={dataForExamTable}
              onEdit={() => navigate(`/exams/create?courseId=${courseId}`)}
            />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Empty description="Aún no hay exámenes para este curso">
            <Text style={{ fontSize: 14 }}>
              Los exámenes creados aparecerán aquí para su gestión.
            </Text>
          </Empty>
          <Button
            type="primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(`/exams/create?courseId=${courseId}`)}
          >
            Crear examen
          </Button>
        </div>
      )}
    </div>
  );
}
