import React from "react";
import { Card, Typography, theme } from "antd";

const { Title } = Typography;

interface Option {
  label: string;
  value: string;
}

interface TestQuestionProps {
  onNext: () => void;
}

export default function TestQuestion({ onNext }: TestQuestionProps) {
  const { token } = theme.useToken();

  const options: Option[] = [
    { label: "O(n²)", value: "A" },
    { label: "O(n log n)", value: "B" },
    { label: "O(n)", value: "C" },
    { label: "O(log n)", value: "D" }
  ];

  const handleSelect = (value: string) => {
    setTimeout(() => {
      onNext();
    }, 300);
  };

  const optionColors = [
    token.colorPrimary,
    token.colorPrimaryHover,
    token.colorInfo,
    token.colorInfoHover
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: token.marginLG,
        padding: token.paddingLG,
        backgroundColor: token.colorBgLayout,
        minHeight: "100%"
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 800,
          textAlign: "center",
          borderRadius: token.borderRadiusLG,
          backgroundColor: token.colorBgContainer,
          boxShadow: token.boxShadow
        }}
      >
        <Title
          level={3}
          style={{
            margin: 0,
            color: token.colorTextHeading
          }}
        >
          ¿Cuál de estas complejidades es más eficiente para ordenar una lista grande?
        </Title>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: token.marginLG,
          width: "100%",
          maxWidth: 800
        }}
      >
        {options.map((opt, index) => (
          <div
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              backgroundColor: optionColors[index],
              color: token.colorTextLightSolid,
              padding: token.paddingLG,
              borderRadius: token.borderRadiusLG,
              fontWeight: 600,
              fontSize: token.fontSizeLG,
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              boxShadow: token.boxShadow,
              userSelect: "none"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = token.boxShadowSecondary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = token.boxShadow;
            }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}
