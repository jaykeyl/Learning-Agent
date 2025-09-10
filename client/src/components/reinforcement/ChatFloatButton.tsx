import React from "react";
import { FloatButton, theme } from "antd";
import { MessageOutlined } from "@ant-design/icons";

interface ChatFloatButtonProps {
  onClick: () => void;
}

export const ChatFloatButton: React.FC<ChatFloatButtonProps> = ({ onClick }) => {
  const { token } = theme.useToken();
  const isLightMode = token.colorBgBase === "#ffffff" || token.colorBgBase === "#fff";

  const styles = {
    wrapper: {
      position: "fixed" as const,
      bottom: 20,
      right: 20,
      zIndex: 9000,
      animation: "fadeScaleIn 0.3s ease-out",
    },
    button: {
      backgroundColor: isLightMode ? "#4da3ff" : token.colorBgElevated, 
      color: isLightMode ? "#ffffff" : token.colorText,
      border: `1px solid ${isLightMode ? "#4da3ff" : token.colorBorderSecondary}`,
      boxShadow: token.boxShadowSecondary,
      transition: "all 0.2s ease",
    },
    icon: {
      fontSize: 20,
      color: isLightMode ? "#ffffff" : token.colorPrimary,
    },
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeScaleIn {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          .chat-float-button:hover {
            transform: scale(1.05);
          }
        `}
      </style>

      <div style={styles.wrapper}>
        <FloatButton
          icon={<MessageOutlined style={styles.icon} />}
          type="default"
          onClick={onClick}
          style={styles.button}
          className="chat-float-button"
        />
      </div>
    </>
  );
};
