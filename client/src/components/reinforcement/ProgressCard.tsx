import React from "react";
import { Typography, Space, Row, Col } from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import { CustomCard } from "../../components/shared/CustomCard";

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const effectiveWidth = 300;
  const effectiveHeight = 120;
  const padding = 20;
  const W = effectiveWidth - padding * 2;
  const H = effectiveHeight - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * W;
    const y = padding + (1 - v / 100) * H;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => (i ? `L${x},${y}` : `M${x},${y}`)).join(" ");

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={3} />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={color} />
      ))}
    </svg>
  );
};

export const ProgressCard: React.FC = () => {
  const data = [60, 85, 95, 75, 88, 92, 80, 70, 90, 82, 98, 87];

  return (
    <div style={{ width: "100%", padding: 24 }}>
      <CustomCard
        style={{
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
        }}
        className="transition-all duration-300 ease-in-out hover:transform hover:-translate-y-2 hover:shadow-2xl"
      >
        <CustomCard.Header
          icon={<LineChartOutlined />}
          title={
            <Typography.Title level={4} style={{ color: "#1A2A80", marginBottom: 0 }}>
              Programación
            </Typography.Title>
          }
        />
        <CustomCard.Description>
          <Typography.Text style={{ color: "#7A85C1" }}>
            Último examen: 14/08/2025
          </Typography.Text>
        </CustomCard.Description>
        <CustomCard.Body>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={14}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text strong style={{ color: "#1A2A80", fontSize: 16 }}>
                  Tasa de éxito: 80%
                </Typography.Text>
                <Typography.Text style={{ color: "#1A2A80", fontSize: 16 }}>
                  Nota último examen: 80
                </Typography.Text>
              </Space>
            </Col>
            <Col xs={24} md={10}>
              <div style={{ width: "100%", height: 120 }}>
                <Sparkline data={data} color="#6366f1" />
              </div>
            </Col>
          </Row>
        </CustomCard.Body>
      </CustomCard>
    </div>
  );
  
};
