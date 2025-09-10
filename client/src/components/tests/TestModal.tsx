import { Modal, Button, Typography, Space, Divider, theme } from "antd";
import { BookOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

interface TestModalProps {
  open: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: number) => void;
}

export default function TestModal({ open, onClose, onSelectDifficulty }: TestModalProps) {
  const { token } = theme.useToken();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={500}
      bodyStyle={{
        padding: 28,
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Title
            level={4}
            style={{
              marginBottom: 4,
              color: token.colorTextHeading,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <BookOutlined style={{ color: token.colorPrimary }} />
            Creación de examen
          </Title>
          <Text style={{ fontSize: 15, color: token.colorTextSecondary }}>
            Selecciona la dificultad para comenzar tu prueba
          </Text>
        </div>

        <Divider style={{ margin: "12px 0", borderColor: token.colorBorder }} />

        <Space
          direction="horizontal"
          size="middle"
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Button
            size="middle"
            style={{
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              border: "none",
              borderRadius: token.borderRadius,
              fontWeight: 500,
            }}
            icon={<BookOutlined />}
            onClick={() => onSelectDifficulty(5)}
          >
            Fácil — 5
          </Button>

          <Button
            size="middle"
            style={{
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              border: "none",
              borderRadius: token.borderRadius,
              fontWeight: 500,
            }}
            icon={<BookOutlined />}
            onClick={() => onSelectDifficulty(7)}
          >
            Medio — 7
          </Button>

          <Button
            size="middle"
            style={{
              background: token.colorPrimary,
              color: token.colorTextLightSolid,
              border: "none",
              borderRadius: token.borderRadius,
              fontWeight: 500,
            }}
            icon={<BookOutlined />}
            onClick={() => onSelectDifficulty(10)}
          >
            Difícil — 10
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}
