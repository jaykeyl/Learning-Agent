import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, theme, Typography, Card } from 'antd';
import { SendOutlined, RightOutlined, MessageOutlined } from '@ant-design/icons';

const TypingIndicator: React.FC<{ token: any }> = ({ token }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: token.sizeMD / 3,
      padding: token.paddingSM,
      borderRadius: token.borderRadiusLG,
      backgroundColor: token.colorBgContainer,
      boxShadow: token.boxShadow,
      maxWidth: 'fit-content',
    }}
  >
    {[0, 0.2, 0.4].map((delay, i) => (
      <div
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: token.colorPrimary,
          animation: 'pulse 1s infinite ease-in-out',
          animationDelay: `${delay}s`,
        }}
      />
    ))}
  </div>
);

const ChatMessage: React.FC<{
  text: string;
  isUser: boolean;
  token: any;
}> = ({ text, isUser, token }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: token.marginLG,
    }}
  >
    <div
      style={{
        padding: `${token.paddingSM}px ${token.paddingLG}px`,
        borderRadius: token.borderRadiusXXL,
        maxWidth: '75%',
        backgroundColor: isUser ? token.colorBgElevated : token.colorBgContainer,
        boxShadow: token.boxShadow,
        fontSize: token.fontSize,
        color: token.colorText,
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}
    >
      {text}
    </div>
  </div>
);

interface OpenQuestionProps {
  onNext: () => void;
}

export default function OpenQuestion({ onNext }: OpenQuestionProps) {
  const { token } = theme.useToken();
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const hasFetchedInitial = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0%,100% { transform: scale(1); opacity: .5; }
        50%    { transform: scale(1.2); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (hasFetchedInitial.current) return;
    hasFetchedInitial.current = true;
    (async () => {
      setIsBotTyping(true);
      await fetchQuestion();
      setIsBotTyping(false);
      setInputDisabled(false);
    })();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isBotTyping, showNextButton]);

  async function fetchQuestion() {
    try {
      const res = await fetch(`${import.meta.env.VITE_URL}${import.meta.env.VITE_CHATINT_URL}`);
      const { question } = await res.json();
      setMessages((m) => [...m, { sender: 'bot', text: question }]);
    } catch {}
  }

  async function sendAnswer() {
    const answer = inputValue.trim();
    if (!answer || isBotTyping) return;
    const lastQuestion = messages[messages.length - 1]?.text || '';
    setMessages((m) => [...m, { sender: 'user', text: answer }]);
    setInputValue('');
    setInputDisabled(true);
    setIsBotTyping(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_URL}${import.meta.env.VITE_CHATINT_ADVICE_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: lastQuestion,
          answer,
          topic: 'fisica',
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { sender: 'bot', text: data.coaching_advice || 'Error.' }]);
    } catch {
      setMessages((m) => [...m, { sender: 'bot', text: 'Hubo un error.' }]);
    } finally {
      setIsBotTyping(false);
      setInputDisabled(false);
      setShowNextButton(true);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: token.paddingLG,
        backgroundColor: token.colorBgLayout,
        overflowAnchor: 'none',
      }}
    >
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: token.sizeSM }}>
            <MessageOutlined />
            <Typography.Text style={{ fontSize: '1.25rem', fontWeight: 500 }}>
              Interview
            </Typography.Text>
          </div>
        }
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 900,
          height: '60vh',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: token.colorBgContainer,
        }}
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: token.paddingLG, overflowAnchor: 'none' }}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} text={msg.text} isUser={msg.sender === 'user'} token={token} />
          ))}
          {isBotTyping && <TypingIndicator token={token} />}
          {showNextButton && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: token.marginLG }}>
              <Button
                type="primary"
                size="large"
                onClick={onNext}
                style={{
                  borderRadius: token.borderRadiusLG,
                  height: 48,
                  padding: `0 ${token.paddingLG}px`,
                  fontWeight: 600,
                  boxShadow: token.boxShadow,
                }}
              >
                Siguiente Pregunta <RightOutlined />
              </Button>
            </div>
          )}
        </div>
        {!showNextButton && (
          <div
            style={{
              padding: token.paddingLG,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Input
              placeholder="Escribe tu respuesta..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={sendAnswer}
              disabled={inputDisabled || isBotTyping}
              size="large"
              style={{
                borderRadius: token.borderRadiusLG,
                marginRight: token.marginSM,
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendAnswer}
              disabled={inputDisabled || isBotTyping}
              style={{
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
