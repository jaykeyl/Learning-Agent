import { Button, Card, Col, Empty, Row, Space, Input } from "antd";
import PageTemplate from "../../components/PageTemplate";
import { useEffect, useState } from "react";
import useCourses from "../../hooks/useCourses";
import type { Course } from "../../interfaces/courseInterface";
import { useNavigate } from "react-router-dom";
import { CreateCourseForm } from "./CreateCourseForm";
import { PlusOutlined } from "@ant-design/icons";
import { useUserStore } from "../../store/userStore";
import AccessDenied from "../../components/shared/AccessDenied";

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

  const renderGrid = (items: Course[]) =>
    items.length ? (
      <Row gutter={[16, 16]}>
        {items.map((course) => (
          <Col xs={24} sm={12} md={8} lg={8} key={course.id}>
            <Card
              hoverable
              onClick={() => goToCourse(course.id)}
              style={{
                width: "100%",
                height: 180,
                textAlign: "center",
                borderRadius: 20,
                padding: "12px",
                display: "flex",
                flexDirection: "column",
              }}
              bodyStyle={{
                padding: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
            >
              {/* Contenedor flexible para el título */}
              <div
                style={{
                  flex: "1 1 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 0,
                  marginBottom: "12px",
                }}
              >
                <h1
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    lineHeight: "1.3",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    margin: 0,
                    maxHeight: "calc(2 * 1.3em)",
                    wordBreak: "break-word",
                  }}
                >
                  {course.name}
                </h1>
              </div>

              {/* Contenedor para los botones */}
              <div
                style={{
                  flex: "0 0 auto",
                  height: "82px",
                }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    style={{ width: "100%" }}
                    onClick={(e) => goToExams(course.id, e)}
                  >
                    Exámenes
                  </Button>
                  <Button
                    style={{ width: "100%" }}
                    onClick={(e) => goToMaterials(course.id, e)}
                  >
                    Materiales
                  </Button>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    ) : (
      <Empty description="No hay materías todavía." />
    );

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

            {renderGrid(filteredCourses)}
          </div>
        </PageTemplate>
      ) : (
        <AccessDenied />
      )}
    </>
  );
}
