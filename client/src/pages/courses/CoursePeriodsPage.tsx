import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button,  Empty, Input, message } from "antd";
import { PlusOutlined, ReadOutlined } from "@ant-design/icons";
import { courseService } from "../../services/course.service";
import PageTemplate from "../../components/PageTemplate";
import { CreatePeriodForm } from "../../components/CreatePeriodForm";
import useClasses from "../../hooks/useClasses";
import type { Course } from "../../interfaces/courseInterface";
import type { Clase, CreateClassDTO } from "../../interfaces/claseInterface";
import { useUserStore } from "../../store/userStore";
import dayjs from "dayjs";
import AccessDenied from "../../components/shared/AccessDenied";
import CustomCard from "../../components/shared/CustomCard";

export function CoursePeriodsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPeriods, setFilteredPeriods] = useState<Clase[]>([]);

  const { classes, createClass, fetchClassesByCourse } = useClasses();

  const loadCourseAndPeriods = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    try {
      // Cargar información del curso
      const courseResponse = await courseService.getCourseById(courseId);
      setCourse(courseResponse.data);

      // Cargar períodos del curso - esto actualizará el estado del hook
      await fetchClassesByCourse(courseId);
    } catch (error) {
      message.error("Error al cargar la información del curso");
      console.error("Error loading course and periods:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      loadCourseAndPeriods();
    }
  }, [courseId, loadCourseAndPeriods]);

  useEffect(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (lower === "") {
      setFilteredPeriods(classes);
      return;
    }

    const filtered = classes.filter((period) =>
      period.semester.toLowerCase().includes(lower) ||
      period.name.toLowerCase().includes(lower)
    );
    setFilteredPeriods(filtered);
  }, [searchTerm, classes]);

  const handleCreatePeriod = async (periodData: CreateClassDTO) => {
    setCreatingPeriod(true);
    try {
      await createClass(periodData);
      if (courseId) {
        await fetchClassesByCourse(courseId);
      }
    } catch (error) {
      // El error ya se maneja en el hook
      console.error(error);
    } finally {
      setCreatingPeriod(false);
    }
  };

  const goToPeriod = (periodId: string) => {
    navigate(`/classes/${periodId}`);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  if (loading) {
    return (
      <PageTemplate
        title="Períodos"
        subtitle="Cargando información..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Materias", href: "/courses" },
          { label: "Cargando..." }
        ]}
      >
        <div style={{ textAlign: "center", padding: "50px" }}>
          <div>Cargando curso y períodos...</div>
        </div>
      </PageTemplate>
    );
  }

  if (!course) {
    return (
      <PageTemplate
        title="Curso no encontrado"
        subtitle="No se pudo cargar la información del curso"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Materias", href: "/courses" },
          { label: "Error" }
        ]}
      >
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Empty description="Curso no encontrado" />
          <Button type="primary" onClick={() => navigate("/courses")}>
            Volver a Materias
          </Button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <>
      {user?.roles.includes("docente") ? (
        <PageTemplate
          title={course.name}
          subtitle="Períodos en los que se dictó esta materia"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Materias", href: "/courses" },
            { label: course.name }
          ]}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "24px",
            }}
          >
            {/* Header con búsqueda y botón crear */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: "12px"
              }}
            >
              <div>
                <Input
                  placeholder="Buscar período..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{
                    width: 240,
                    borderRadius: 8
                  }}
                />
              </div>
              {user?.roles.includes("docente") && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalOpen(true)}
                  style={{
                    borderRadius: 8,
                    fontWeight: "500"
                  }}
                >
                  Crear Período
                </Button>
              )}
            </div>

            {filteredPeriods.length > 0 ? (
              <>{filteredPeriods.map((period) => (
                <CustomCard
                  status="default"
                  style={{ marginBottom: "16px" }}
                  onClick={() => goToPeriod(period.id)}
                  key={period.id}
                >
                  <CustomCard.Header
                    icon={<ReadOutlined />}
                    title={period.semester}
                  />
                  <CustomCard.Description>
                    {`Consulte la información de ${period.name}`}
                  </CustomCard.Description>
                  <CustomCard.Body>
                    <div style={{ marginBottom: "2px" }}>
                      Inicio: {dayjs(period.dateBegin).format("DD/MM/YYYY")}
                    </div>
                    <div>
                      Fin: {dayjs(period.dateEnd).format("DD/MM/YYYY")}
                    </div>
                  </CustomCard.Body>
                </CustomCard>
              ))}</>
            ) : (
              <Empty
                description="No hay períodos creados para esta materia"
                style={{
                  margin: "40px 0",
                  padding: "20px",
                }}
              />
            )}

            {/* Modal para crear período */}
            {course && (
              <CreatePeriodForm
                open={modalOpen}
                onClose={handleModalCancel}
                onSubmit={handleCreatePeriod}
                course={course}
                loading={creatingPeriod}
              />
            )}
          </div>
        </PageTemplate>
      ) : (
        <AccessDenied />
      )}
    </>
  );
}
