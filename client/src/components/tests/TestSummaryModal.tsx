
import { useMemo } from "react";
import { Row, Col, List, Tag, Typography, Progress, theme } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import CustomModal from "../reinforcement/CustomModal";

const { Text } = Typography;

export default function TestSummaryModal({
  open,
  onClose,
  answers,
  questionCount,
  timeTaken,
}: {
  open: boolean;
  onClose: () => void;
  answers: boolean[];
  questionCount: number;
  timeTaken: number | null;
}) {
  const { token } = theme.useToken();

  const correctAnswers = useMemo(() => answers.filter(Boolean).length, [answers]);
  const percentage = useMemo(
    () => (questionCount > 0 ? Math.round((correctAnswers / questionCount) * 100) : 0),
    [correctAnswers, questionCount]
  );

  const formattedTime = useMemo(() => {
    if (!timeTaken || timeTaken <= 0) return "00:00";
    const totalSeconds = Math.floor(timeTaken / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeTaken]);

  const results = useMemo(
    () =>
      answers.map((correct, index) => ({
        key: index,
        question: `Pregunta ${index + 1}`,
        correct,
      })),
    [answers]
  );

  return (
    <CustomModal visible={open} onClose={onClose} status="default" width={700} padding={24}>
      <CustomModal.Header icon={<BarChartOutlined />} title="Resumen del examen" />
      <CustomModal.Description>Detalle de tu rendimiento y tiempo empleado</CustomModal.Description>
      <CustomModal.Body>
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} md={8} style={{ textAlign: "center" }}>
            <Progress
              type="circle"
              percent={percentage}
              size={140}
              strokeColor={token.colorPrimary}
              format={(p) => `${p}%`}
            />
            <div style={{ marginTop: token.marginSM }}>
              <Text strong style={{ fontSize: 15 }}>
                Porcentaje de éxito
              </Text>
            </div>
            <div style={{ marginTop: token.marginXS }}>
              <Text strong>Tiempo empleado:</Text> <Text>{formattedTime}</Text>
            </div>
          </Col>
          <Col xs={24} md={16}>
            <div
              style={{
                maxHeight: 250,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              <List
                header={<Text strong>Detalle por pregunta</Text>}
                dataSource={results}
                renderItem={(item) => (
                  <List.Item
                    key={item.key}
                    style={{
                      backgroundColor: token.colorFillTertiary,
                      borderRadius: token.borderRadiusSM,
                      padding: "8px 12px",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text>{item.question}:</Text>
                    <Tag
                      color={token.colorPrimary}
                      style={{
                        border: "none",
                        color: token.colorTextLightSolid,
                        fontWeight: "bold",
                        marginLeft: 16,
                        minWidth: 50,
                        textAlign: "center",
                      }}
                    >
                      {item.correct ? "Bien" : "Mal"}
                    </Tag>
                  </List.Item>
                )}
              />
            </div>
          </Col>
        </Row>
      </CustomModal.Body>
    </CustomModal>
  );
}
