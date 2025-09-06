import React, { useState } from 'react';
import { Checkbox, Button, Typography, theme, Card } from 'antd';
import { RightOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

interface TeoricQuestionProps {
  onNext: () => void;
}

export default function TeoricQuestion({ onNext }: TeoricQuestionProps) {
  const { token } = theme.useToken();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const options = [
    { label: 'O(log n)', value: 'log n' },
    { label: 'O(n)', value: 'n' },
    { label: 'O(n log n)', value: 'n log n' },
    { label: 'O(n²)', value: 'n²' },
  ];

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
            ¿Cuál es la complejidad temporal de buscar un elemento en un array ordenado usando búsqueda binaria?
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
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <Checkbox
                key={option.value}
                value={option.value}
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
                    {option.label}
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
