import { useEffect, useState } from "react";
import { theme } from "antd";
import { useNavigate } from "react-router-dom";

type Props = { questionCount?: number; onTimeUp?: () => void };

export function TestTimer({ questionCount = 1, onTimeUp }: Props) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const totalTime = questionCount * 30;
  const [timeLeft, setTimeLeft] = useState(totalTime);

  useEffect(() => {
    setTimeLeft(totalTime);
  }, [totalTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeUp) onTimeUp();
          navigate("/reinforcement");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onTimeUp, navigate]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const isDanger = timeLeft <= 10;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "'Fira Code', monospace",
        fontSize: 22,
        fontWeight: 600,
        padding: "10px 18px",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${isDanger ? token.colorErrorBorder : token.colorBorderSecondary}`,
        background: `${token.colorBgElevated}cc`,
        backdropFilter: "blur(8px)",
        color: isDanger ? token.colorError : token.colorText,
        boxShadow: token.boxShadowSecondary,
        transition: "all 0.3s ease",
        animation: isDanger ? "pulse 1s infinite" : "none"
      }}
    >
      <span style={{ fontSize: 18 }}>⏱</span>
      {minutes}:{seconds}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
