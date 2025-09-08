import React, { useEffect, useState } from "react";
import { Card, Typography, theme } from "antd";

const { Title } = Typography;

interface MultipleSelectionTestResponse {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TestQuestionProps {
  onNext: () => void;
}

export default function TestQuestion({ onNext }: TestQuestionProps) {
  const { token } = theme.useToken();
  const [multSelectionTest, setMultSelectionTest] = useState<MultipleSelectionTestResponse>({
    question: "",
    options: [],
    correctAnswer: -1
  });

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

  useEffect(() => {
    fetchQuestion();
  }, []);

  async function fetchQuestion() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_URL}${import.meta.env.VITE_TESTCHAT_URL}`
      );
      const testOp = (await res.json()) as MultipleSelectionTestResponse;
      setMultSelectionTest({
        question: testOp.question || "",
        options: testOp.options || [],
        correctAnswer: typeof testOp.correctAnswer === "number" ? testOp.correctAnswer : -1
      });
    } catch (error) {
      console.error(error);
    }
  }

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
          {multSelectionTest.question}
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
        {multSelectionTest.options.map((opt, index) => (
          <div
            key={index}
            onClick={() => handleSelect(opt)}
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
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}
