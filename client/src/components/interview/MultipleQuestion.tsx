import { useEffect, useState } from 'react';
import { Typography, Checkbox, Button, Card, theme } from 'antd';
import { RightOutlined, CodeOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

interface MultipleQuestionProps {
  onNext: () => void;
}
interface TitleAndOption {
  label: string;
  answer: string;
}
interface DoubleOptionResponse {
  question: string;
  options: TitleAndOption[];
  correctAnswer: number;
  explanation: string;
}

export default function MultipleQuestion({ onNext }: MultipleQuestionProps) {
  const { token } = theme.useToken();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [doubleOption , setDoubleOption] = useState<DoubleOptionResponse>();

  const handleCheckboxChange = (values: string[]) => {
    setSelectedValues(values);
  };

  useEffect(() => {
    fetchQuestion();
  }, []);
  async function fetchQuestion() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_URL}${import.meta.env.VITE_CHATINT_DOUBLEOPTION_URL}`
      );
      const doubleOp = await res.json() as DoubleOptionResponse;
      setDoubleOption(doubleOp);
    } catch (error) { 
      console.log(error);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: token.paddingLG,
        backgroundColor: token.colorBgLayout,
      }}
    >
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: token.sizeSM }}>
            <CodeOutlined />
            <Typography.Text style={{ fontSize: '1.25rem', fontWeight: 500 }}>
              Pregunta de Complejidad
            </Typography.Text>
          </div>
        }
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 800,
          backgroundColor: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadow,
        }}
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: token.paddingLG,
        }}
      >
        <div
          style={{
            padding: token.paddingMD,
            borderRadius: token.borderRadiusLG,
            backgroundColor: token.colorBgContainer,
            maxWidth: '100%',
            marginBottom: token.marginLG,
            textAlign: 'center',
          }}
        >
          <Paragraph
            style={{
              margin: 0,
              fontWeight: 'bold',
              color: token.colorText,
              fontSize: token.fontSizeLG,
            }}
          >
            {doubleOption?.question}
          </Paragraph>
        </div>

        <Checkbox.Group
          onChange={(vals) => handleCheckboxChange(vals as string[])}
          value={selectedValues}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: token.marginMD,
            justifyContent: 'center',
          }}
        >
          {doubleOption?.options.map((opt, i) => {
            const selected = selectedValues.includes(opt.answer);
            return (
              <Checkbox key={i} value={opt.answer} style={{ margin: 0 }}>
                <div
                  style={{
                    width: 320,
                    padding: token.paddingMD,
                    borderRadius: token.borderRadiusLG,
                    border: `2px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                    backgroundColor: selected ? token.colorPrimaryBg : token.colorBgContainer,
                    boxShadow: selected
                      ? `0 4px 12px ${token.colorPrimary}33`
                      : '0 2px 5px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  <Paragraph
                    style={{
                      margin: 0,
                      fontWeight: 'bold',
                      color: token.colorText,
                      marginBottom: token.marginSM,
                    }}
                  >
                    {opt.label}
                  </Paragraph>
                  <pre
                    style={{
                      backgroundColor: token.colorFillTertiary,
                      padding: token.paddingSM,
                      borderRadius: token.borderRadiusSM,
                      fontSize: token.fontSizeSM,
                      overflowX: 'auto',
                      margin: 0,
                      color: token.colorText,
                    }}
                  >
                    {opt.answer}
                  </pre>
                </div>
              </Checkbox>
            );
          })}
        </Checkbox.Group>

        {selectedValues.length > 0 && (
          <Button
            type="primary"
            size="large"
            onClick={onNext}
            style={{
              marginTop: token.marginLG,
              borderRadius: token.borderRadiusLG,
              height: 48,
              padding: `0 ${token.paddingLG}px`,
              fontWeight: 600,
              boxShadow: token.boxShadow,
            }}
          >
            Siguiente Pregunta <RightOutlined />
          </Button>
        )}
      </Card>
    </div>
  );
}
