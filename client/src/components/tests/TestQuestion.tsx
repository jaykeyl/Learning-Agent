import { Card, Typography, theme } from "antd";

const { Title } = Typography;


interface TestQuestionProps {
  questionData: {
    question: string;
    options: string[];
    correctIndex: number;
  };
  onNext: (isCorrect: boolean) => void;
}

export default function TestQuestion({ questionData, onNext }: TestQuestionProps) {
  const { token } = theme.useToken();
  const { question, options = [], correctIndex } = questionData;

  const handleSelect = (index: number) => {
    const isCorrect = index === correctIndex;
    setTimeout(() => onNext(isCorrect), parseInt(token.motionDurationMid) || 300);
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: token.marginLG,
    padding: token.paddingXL,
    backgroundColor: token.colorBgLayout,
    minHeight: "100%",
  };

  const questionCardStyle: React.CSSProperties = {
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgContainer,
    borderLeft: `${token.lineWidth * 4}px solid ${token.colorPrimary}`,
    padding: token.paddingLG,
    textAlign: "center",
    maxWidth: token.screenLG,
    width: "100%",
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const optionStyle: React.CSSProperties = {
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorPrimary,
    color: token.colorTextLightSolid,
    fontWeight: token.fontWeightStrong,
    fontSize: token.fontSizeLG,
    textAlign: "center",
    cursor: "pointer",
    transition: `transform ${token.motionDurationMid} ${token.motionEaseOut}, box-shadow ${token.motionDurationMid} ${token.motionEaseOut}`,
    boxShadow: token.boxShadow,
    userSelect: "none",
    padding: token.paddingMD,
    minHeight: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={containerStyle}>
      <Card style={questionCardStyle}>
        <Title
          level={4}
          style={{
            margin: 0,
            color: token.colorPrimary,
            fontWeight: token.fontWeightStrong,
          }}
        >
          {question}
        </Title>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: token.marginMD,
          width: "100%",
          maxWidth: token.screenLG,
        }}
      >
        {options.map((label, index) => (
          <div
            key={index}


            onClick={() => handleSelect(index)}
            style={optionStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = token.boxShadowSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = token.boxShadow;
            }}

          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
