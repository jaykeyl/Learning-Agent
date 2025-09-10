import React from "react";
import { Row, Col, Typography } from "antd";
import { Link } from "react-router-dom";
import { BookOutlined } from "@ant-design/icons";
import { CustomCard } from "../../components/shared/CustomCard";

interface Course {
  id: string;
  title: string;
  description: string;
}

interface CourseCardsProps {
  courses: Course[];
}

export const CourseCards: React.FC<CourseCardsProps> = ({ courses }) => (
  <Row gutter={[24, 24]} justify="center" className="mt-4"> {/* margen superior reducido */}
    {courses.map((course) => (
      <Col xs={24} md={12} key={course.id}>
        <Link to={`/${course.id}`} className="no-underline">
          <CustomCard
            style={{
              maxWidth: 450,
              width: "100%",
              height: "100%",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "24px",
            }}
            className="animate-fade-in hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out"
          >
            <CustomCard.Header
              icon={<BookOutlined />}
              title={
                <Typography.Text style={{ fontSize: "1.25rem", fontWeight: 500 }}>
                  {course.title}
                </Typography.Text>
              }
            />
            <CustomCard.Description>
              <Typography.Text type="secondary" style={{ fontSize: "0.95rem" }}>
                {course.description}
              </Typography.Text>
            </CustomCard.Description>
          </CustomCard>
        </Link>
      </Col>
    ))}
  </Row>
);
