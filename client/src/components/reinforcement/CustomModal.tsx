import React from "react";
import { Modal, Row, Col, Space, Typography, theme } from "antd";
import type { ReactNode, CSSProperties } from "react";

const { Title, Text } = Typography;
const { useToken } = theme;

interface CustomModalProps {
  status?: "default" | "success" | "warning" | "error";
  width?: number;
  height?: number;
  padding?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  visible: boolean;
  onClose: () => void;
}

interface HeaderProps {
  icon: ReactNode;
  title: ReactNode;
}

interface DescriptionProps {
  children: ReactNode;
}

interface BodyProps {
  children: ReactNode;
}

interface ActionsProps {
  children: ReactNode;
}

const componentIds = {
  header: Symbol("CustomModal.Header"),
  description: Symbol("CustomModal.Description"),
  body: Symbol("CustomModal.Body"),
  actions: Symbol("CustomModal.Actions"),
};

interface ComponentWithId {
  $id: symbol;
}

function isComponentType(child: React.ReactNode, id: symbol): boolean {
  if (!React.isValidElement(child)) return false;
  return (child.type as unknown as ComponentWithId)?.$id === id;
}

const Header: React.FC<HeaderProps> & { $id?: symbol } = ({ icon, title }) => {
  const { token } = useToken();
  return (
    <Space align="center" size={16} style={{ width: "100%", minWidth: 0 }}>
      <div
        style={{
          width: 48,
          height: 48,
          display: "grid",
          placeItems: "center",
          borderRadius: token.borderRadiusLG,
          background: token.colorFillSecondary,
          color: token.colorPrimary,
          fontSize: token.fontSizeLG,
        }}
      >
        {icon}
      </div>
      <Title
        level={4}
        style={{
          margin: 0,
          color: token.colorTextHeading,
          fontWeight: token.fontWeightStrong,
          whiteSpace: "normal",
          wordBreak: "break-word",
        }}
      >
        {title}
      </Title>
    </Space>
  );
};
Header.$id = componentIds.header;

const Description: React.FC<DescriptionProps> & { $id?: symbol } = ({
  children,
}) => {
  const { token } = useToken();
  return (
    <Text
      style={{
        display: "block",
        marginTop: token.marginXS,
        marginBottom: token.marginXS,
        color: token.colorTextSecondary,
        fontSize: token.fontSizeSM,
        lineHeight: 1.4,
      }}
    >
      {children}
    </Text>
  );
};
Description.$id = componentIds.description;

const Body: React.FC<BodyProps> & { $id?: symbol } = ({ children }) => {
  const { token } = useToken();
  return (
    <div
      style={{
        marginTop: token.marginXXS,
        marginBottom: token.marginXS,
        fontSize: token.fontSizeSM,
        lineHeight: 1.5,
        color: token.colorText,
      }}
    >
      {children}
    </div>
  );
};
Body.$id = componentIds.body;

const Actions: React.FC<ActionsProps> & { $id?: symbol } = ({ children }) => {
  const childArray = React.Children.toArray(children);
  const limitedChildren = childArray.slice(0, 3);
  return (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      {limitedChildren.map((child, index) => (
        <div key={index} style={{ width: "100%" }}>
          {React.isValidElement(child)
            ? React.cloneElement(child, {
                style: { width: "100%", justifyContent: "flex-start" },
              } as React.HTMLAttributes<HTMLElement>)
            : child}
        </div>
      ))}
    </Space>
  );
};
Actions.$id = componentIds.actions;

const Root: React.FC<CustomModalProps> & {
  Header: typeof Header;
  Description: typeof Description;
  Body: typeof Body;
  Actions: typeof Actions;
} = ({
  status = "default",
  width = 580,

  padding = 24,
  className,
  style,
  children,
  visible,
  onClose,
}) => {
  const { token } = useToken();
  const allChildren = React.Children.toArray(children);
  const header = allChildren.find((child) =>
    isComponentType(child, componentIds.header)
  );
  const description = allChildren.find((child) =>
    isComponentType(child, componentIds.description)
  );
  const body = allChildren.find((child) =>
    isComponentType(child, componentIds.body)
  );
  const actions = allChildren.find((child) =>
    isComponentType(child, componentIds.actions)
  );
  if (!header) {
    throw new Error(
      "CustomModal: Header es obligatorio. Asegúrate de incluir <CustomModal.Header> como hijo directo."
    );
  }
  const hasActions = Boolean(actions);
  const modalWidth = hasActions ? Math.max(width, 580) : width;
  const accentColor = {
    success: token.colorSuccess,
    warning: token.colorWarning,
    error: token.colorError,
    default: token.colorPrimary,
  }[status];
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      className={className}
      style={{
        ...style,
        borderRadius: token.borderRadiusLG,
        overflow: "hidden",
        paddingBottom: 0,
        background: token.colorBgContainer,
      }}
      centered
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: accentColor,
        }}
      />
      <Row
        align="top"
        wrap={false}
        style={{ width: "100%", height: "100%", background: token.colorBgContainer }}
      >
        <Col
          flex="auto"
          style={{
            padding,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: "0 0 auto" }}>
            {header}
            {description}
          </div>
          {body && (
            <div style={{ flex: "1 1 auto", marginTop: token.marginXXS }}>
              {body}
            </div>
          )}
        </Col>
        {hasActions && (
          <>
            <Col flex="0 0 1px">
              <div
                style={{
                  width: 1,
                  height: "100%",
                  background: token.colorSplit,
                }}
              />
            </Col>
            <Col flex="260px" style={{ padding }}>
              {actions}
            </Col>
          </>
        )}
      </Row>
    </Modal>
  );
};

Root.Header = Header;
Root.Description = Description;
Root.Body = Body;
Root.Actions = Actions;

export default Root;
