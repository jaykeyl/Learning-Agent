import { Button, Empty, Space, Input } from "antd";
import PageTemplate from "../../components/PageTemplate";
import { useEffect, useState } from "react";
import useCourses from "../../hooks/useCourses";
import type { Course } from "../../interfaces/courseInterface";
import { useNavigate } from "react-router-dom";
import { CreateCourseForm } from "./CreateCourseForm";
import { PlusOutlined, SolutionOutlined } from "@ant-design/icons";
import { useUserStore } from "../../store/userStore";
import AccessDenied from "../../components/shared/AccessDenied";
import CustomCard from "../../components/shared/CustomCard";

export function TeacherCoursePage() {
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);
  const { courses, createCourse, fetchCoursesByTeacher } = useCourses();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(courses);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    if (!user) return
    fetchCoursesByTeacher(user.id)
  }, [fetchUser]);

  useEffect(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (lower == "") {
      setFilteredCourses(courses);
      return;
    }

    const words = lower.split(" ");
    const specialChars = /[!@#$%^&*?:{}|<>]/;

    const filterWords = (c: Course, words: string[]) => {
      let match = true;
      for (const word of words) {
        if (!match) return false;
        if (specialChars.test(word)) continue;
        match = match && c.name.toString().toLowerCase().includes(word);
      }
      return match;
    };

    const filtered = courses.filter((c) => filterWords(c, words));
    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  const goToCourse = (id: string) => {
    navigate(`/courses/${id}/periods`);
  };

  const goToExams = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/exams/${id}`);
  };

  const goToMaterials = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/materials/${id}`);
  };

  const handleAddCourse = (values: any) => {
    createCourse(values.name);
  };

  return (
    <>
      {user?.roles.includes("docente") ? (
        <PageTemplate
          title="Materias"
          subtitle="Revisa a detalle las materias que dictaste en algún momento."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Materias" }]}
        >
          <div
            className="w-full lg:max-w-6xl lg:mx-auto space-y-4 sm:space-y-6"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "24px 24px",
            }}
          >
            <CreateCourseForm
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSubmit={handleAddCourse}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Space>
                <Input
                  placeholder="Buscar materia"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{ width: 240 }}
                />
              </Space>
              {user?.roles.includes("docente") && (
                <Button type="primary" onClick={() => setModalOpen(true)}>
                  <PlusOutlined />
                  Registrar materia
                </Button>
              )}
            </div>

            {filteredCourses.length > 0 ? (
              <>{filteredCourses.map((course) => (
                <CustomCard
                  status="default"
                  style={{ marginBottom: "16px" }}
                  onClick={() => goToCourse(course.id)}
                  key={course.id}
                >
                  <CustomCard.Header
                    icon={<SolutionOutlined />}
                    title={course.name}
                  />
                  <CustomCard.Description>
                    {`Vea a detalle los periodos que ha dictado en ${course.name}`}
                  </CustomCard.Description>
                  <CustomCard.Actions>
                    <Button
                      type="primary"
                      onClick={(e) => goToExams(course.id, e)}
                    >
                      Exámenes
                    </Button>
                    <Button
                      onClick={(e) => goToMaterials(course.id, e)}
                    >
                      Materiales
                    </Button>
                  </CustomCard.Actions>
                </CustomCard>
              ))}</>
            ) : (
              <Empty description="No hay materías todavía." />
            )}
          </div>
        </PageTemplate>
      ) : (
        <AccessDenied />
      )}
    </>
  );
}
