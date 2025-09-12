import { useEffect, useState } from 'react';
import { Checkbox, Button, Typography, theme, Card } from 'antd';
import { RightOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

interface TeoricQuestionProps {
  onNext: () => void;
}
interface MultipleSelectionResponse {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function TeoricQuestion({ onNext }: TeoricQuestionProps) {
  const { token } = theme.useToken();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [mulOption, setMulOption] = useState<MultipleSelectionResponse>();

  useEffect(() => {
    fetchQuestion();
  }, []);
  async function fetchQuestion() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_URL}${import.meta.env.VITE_CHATINT_MULTOPTION_URL}`
      );
      const obj = await res.json() as MultipleSelectionResponse;
      setMulOption(obj);
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
            <QuestionCircleOutlined />
            <Typography.Text style={{ fontSize: '1.25rem', fontWeight: 500 }}>
              Pregunta Teórica
            </Typography.Text>
          </div>
        }
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 600,
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
             {mulOption?.question}
          </Paragraph>
        </div>

        <Checkbox.Group
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: token.marginSM,
            alignItems: 'center',
            width: '100%',
          }}
          value={selectedValues}
          onChange={(checked) => setSelectedValues(checked as string[])}
        >
          {mulOption?.options.map((option,i) => {
            const selected = selectedValues.includes(option);
            return (
              <Checkbox
                key={i}
                value={option}
                style={{ width: '100%', maxWidth: 320 }}
              >
                <div
                  style={{
                    padding: `${token.paddingSM}px ${token.paddingLG}px`,
                    borderRadius: token.borderRadiusLG,
                    border: `2px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                    backgroundColor: selected ? token.colorPrimaryBg : token.colorBgContainer,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  <Paragraph
                    style={{
                      margin: 0,
                      fontWeight: 'bold',
                      color: token.colorText,
                    }}
                  >
                     {option}
                  </Paragraph>
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
              backgroundColor: token.colorPrimary,
            }}
          >
            Siguiente Pregunta <RightOutlined />
          </Button>
        )}
      </Card>
    </div>
  );
}
