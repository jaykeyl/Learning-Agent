import { Alert, Button, Space, theme } from "antd";
import { BookOutlined } from "@ant-design/icons";
import CustomModal from "../reinforcement/CustomModal";

interface TestModalProps {
  open: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: number) => void;
}

export default function TestModal({ open, onClose, onSelectDifficulty }: TestModalProps) {
  const { token } = theme.useToken();

  return (
    <CustomModal visible={open} onClose={onClose} status="default" width={500} padding={24}>
      <CustomModal.Header icon={<BookOutlined />} title="Creación de examen" />
      <CustomModal.Description>
        Selecciona la dificultad para comenzar tu prueba
      </CustomModal.Description>
      <CustomModal.Body>
        <Alert
          message="Se asignará un tiempo de 30 segundos por pregunta"
          type="warning"
          showIcon
          style={{
            marginBottom: token.marginLG,
            borderRadius: token.borderRadiusLG,
          }}
        />
        <Space
          direction="horizontal"
          size="middle"
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Button
            size="large"
            icon={<BookOutlined />}
            style={{
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              border: "none",
              borderRadius: token.borderRadius,
              fontWeight: 500,
              minWidth: 140,
            }}
            onClick={() => onSelectDifficulty(5)}
          >
            Fácil — 5
          </Button>
          <Button
            size="large"
            icon={<BookOutlined />}
            style={{
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              border: "none",
              borderRadius: token.borderRadius,
              fontWeight: 500,
              minWidth: 140,
            }}
            onClick={() => onSelectDifficulty(7)}
          >
            Medio — 7
          </Button>
          <Button
            size="large"
            icon={<BookOutlined />}
            style={{
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              border: "none",
              borderRadius: token.borderRadius,
              fontWeight: 500,
              minWidth: 140,
            }}
            onClick={() => onSelectDifficulty(10)}
          >
            Difícil — 10
          </Button>
        </Space>
      </CustomModal.Body>
    </CustomModal>
  );
}
