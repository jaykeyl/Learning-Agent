import React from "react";
import { Card, Typography, theme, Alert, Button } from "antd";

const { Title } = Typography;

interface TrueOrFalseQuestionProps {
  onNext?: () => void;
  question?: string;
}

export default function TrueOrFalseQuestion({ onNext, question = "" }: TrueOrFalseQuestionProps) {
  const { token } = theme.useToken();

  const handleSelect = (_value: boolean) => {
    if (onNext) {
      setTimeout(() => onNext(), 300);
    } else {
      setTimeout(() => window.location.reload(), 300);
    }
  };

  if (!question) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: token.marginLG,
          padding: token.paddingLG,
          backgroundColor: token.colorBgLayout,
          minHeight: "100%",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: 800,
            textAlign: "center",
            borderRadius: token.borderRadiusLG,
            backgroundColor: token.colorBgContainer,
            boxShadow: token.boxShadow,
          }}
        >
          <Title level={3} style={{ margin: 0, color: token.colorTextHeading }}>
            Pregunta no disponible
          </Title>
        </Card>

        <Alert
          message="No se encontró la pregunta"
          description={
            <div>
              Esta vista espera recibir la pregunta desde el backend. Usa <strong>TestRunner</strong> para obtener preguntas generadas.
            </div>
          }
          type="info"
          showIcon
        />

        <div style={{ marginTop: 8 }}>
          <Button onClick={() => (onNext ? onNext() : window.location.reload())}>Recargar</Button>
        </div>
      </div>
    );
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
        minHeight: "100%",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 800,
          textAlign: "center",
          borderRadius: token.borderRadiusLG,
          backgroundColor: token.colorBgContainer,
          boxShadow: token.boxShadow,
        }}
      >
        <Title level={3} style={{ margin: 0, color: token.colorTextHeading }}>
          {question}
        </Title>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: token.marginLG,
          width: "100%",
          maxWidth: 800,
        }}
      >
        <div
          onClick={() => handleSelect(true)}
          style={{
            backgroundColor: token.colorPrimary,
            color: token.colorTextLightSolid,
            padding: token.paddingLG,
            borderRadius: token.borderRadiusLG,
            fontWeight: 600,
            fontSize: token.fontSizeLG,
            textAlign: "center",
            cursor: "pointer",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            boxShadow: token.boxShadow,
            userSelect: "none",
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
          Verdadero
        </div>

        <div
          onClick={() => handleSelect(false)}
          style={{
            backgroundColor: token.colorPrimaryHover,
            color: token.colorTextLightSolid,
            padding: token.paddingLG,
            borderRadius: token.borderRadiusLG,
            fontWeight: 600,
            fontSize: token.fontSizeLG,
            textAlign: "center",
            cursor: "pointer",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            boxShadow: token.boxShadow,
            userSelect: "none",
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
          Falso
        </div>
      </div>
    </div>
  );
}
