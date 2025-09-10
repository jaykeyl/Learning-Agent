import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Input, Button, Typography, theme } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useChatLogic } from '../../hooks/useChatLogic';

interface ChatModalProps {
  isChatOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isChatOpen, onClose }) => {
  const { token } = theme.useToken();
  const {
    isTyping,
    messages,
    inputValue,
    messagesEndRef,
    handleSendMessage,
    setInputValue,
    handleKeyPress,
    handleChatClick,
  } = useChatLogic();

  useEffect(() => {
    if (isChatOpen) {
      handleChatClick();
    }
  }, [isChatOpen]);

  const styles = {
    container: {
      height: 400,
      width: 400,
      display: 'flex',
      flexDirection: 'column',
      background: token.colorBgContainer,
      borderRadius: 16, 
      overflow: 'hidden',
      boxShadow: token.boxShadow,
      border: 'none',
      outline: 'none',
      zIndex: 9999,
    } as CSSProperties,
    header: {
      padding: 16,
      borderBottom: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      background: token.colorPrimary,
    } as CSSProperties,
    headerText: {
      color: token.colorWhite,
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
    } as CSSProperties,
    closeButton: {
      position: 'absolute',
      right: 10,
      top: 10,
      color: token.colorWhite,
    } as CSSProperties,
    body: {
      flex: 1,
      overflowY: 'auto',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: token.colorBgLayout,
    } as CSSProperties,
    messageBubble: (isUser: boolean) =>
      ({
        padding: '10px 14px',
        maxWidth: '80%',
        borderRadius: isUser ? '18px 18px 4px 18px' : 18,
        fontSize: 14,
        lineHeight: 1.4,
        wordBreak: 'break-word',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        background: isUser ? token.colorPrimaryBg : token.colorBgContainer,
        color: isUser ? token.colorPrimaryText : token.colorText,
        boxShadow: isUser ? undefined : token.boxShadow,
        transition: 'all 0.2s ease',
      } as React.CSSProperties),
    typingContainer: {
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      width: 'fit-content',
      background: token.colorBgContainer,
      borderRadius: 16,
      boxShadow: token.boxShadow,
    } as CSSProperties,
    typingDot: {
      width: 10,
      height: 10,
      backgroundColor: token.colorPrimary,
      borderRadius: '50%',
      animation: 'typing-dot-bounce 1.4s infinite ease-in-out both',
    } as CSSProperties,
    footer: {
      padding: 16,
      borderTop: 'none',
      background: token.colorBgContainer,
    } as CSSProperties,
    input: {
      borderRadius: 20,
      border: `1px solid ${token.colorBorder}`,
      color: token.colorText,
    } as React.CSSProperties,
  };

  if (!isChatOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes typing-dot-bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}
      </style>

      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          background: 'transparent',
        }}
      >
        <div style={styles.container}>
          <div style={styles.header}>
            <Typography.Title level={4} style={styles.headerText}>
              Asistente Virtual
            </Typography.Title>
            <Button type="text" onClick={onClose} style={styles.closeButton}>
              X
            </Button>
          </div>

          <div style={styles.body}>
            {messages.map((message, index) => {
              const isUser = message.sender === 'user';
              return (
                <div key={index} style={styles.messageBubble(isUser)}>
                  {message.text}
                </div>
              );
            })}
            {isTyping && (
              <div style={styles.typingContainer}>
                <span style={{ ...styles.typingDot, animationDelay: '-0.6s' }} />
                <span style={{ ...styles.typingDot, animationDelay: '-0.3s' }} />
                <span style={{ ...styles.typingDot, animationDelay: '0s' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.footer}>
            <Input
              placeholder="Escribe tu mensaje..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleKeyPress}
              style={styles.input}
              suffix={
                <Button
                  type="text"
                  onClick={handleSendMessage}
                  icon={<SendOutlined />}
                  disabled={inputValue.trim().length < 1 || isTyping}
                />
              }
            />
          </div>
        </div>
      </div>
    </>
  );
};
