/**
 * @fileoverview CustomCard - Componente de tarjeta modular y reutilizable
 * 
 * Este archivo contiene la implementación de un componente de tarjeta que sigue
 * el patrón Compound Component, permitiendo composición flexible de elementos.
 * 
 * @version 1.0.0
 * @author Learning Agent Team
 * @since 2025-08-30
 * 
 * @example Importación y uso básico
 * ```tsx
 * import CustomCard from '@/components/shared/CustomCard';
 * 
 * function DocumentCard() {
 *   return (
 *     <CustomCard status="default">
 *       <CustomCard.Header 
 *         icon={<FileTextOutlined />} 
 *         title="Documento Q2" 
 *       />
 *       <CustomCard.Description>
 *         Informe financiero del segundo trimestre
 *       </CustomCard.Description>
 *       <CustomCard.Actions>
 *         <Button type="primary">Abrir</Button>
 *         <Button>Descargar</Button>
 *       </CustomCard.Actions>
 *     </CustomCard>
 *   );
 * }
 * ```
 * 
 * @example Layout de grilla (2 columnas)
 * ```tsx
 * <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, maxWidth: 1200 }}>
 *   <CustomCard>...</CustomCard>
 *   <CustomCard>...</CustomCard>
 *   <CustomCard>...</CustomCard>
 *   <CustomCard>...</CustomCard>
 * </div>
 * ```
 */

/**
 * CustomCard - Componente de tarjeta modular y reutilizable
 * 
 * Un componente de tarjeta flexible que sigue el patrón Compound Component,
 * permitiendo composición de diferentes elementos (Header, Description, Body, Actions)
 * con estados visuales y dimensiones consistentes.
 * 
 * @example
 * ```tsx
 * <CustomCard status="success">
 *   <CustomCard.Header icon={<CheckIcon />} title="Proceso Completado" />
 *   <CustomCard.Description>
 *     La operación se ha ejecutado exitosamente
 *   </CustomCard.Description>
 *   <CustomCard.Actions>
 *     <Button type="primary">Ver Detalles</Button>
 *     <Button>Cerrar</Button>
 *   </CustomCard.Actions>
 * </CustomCard>
 * ```
 */
import React from "react";
import { Card, Row, Col, Space, Typography } from "antd";
import type { ReactNode, CSSProperties } from "react";

const { Title, Text } = Typography;

// ===================== Paleta de colores =====================
/**
 * Paleta de colores predefinida para el sistema de diseño
 * Mantiene consistencia visual en todos los componentes
 */
const PALETTE = {
  primary: "#1A2A80",      // Color principal del sistema
  secondary: "#3B38A0",    // Color secundario
  lightBlue: "#7A85C1",    // Azul claro para texto secundario
  veryLightBlue: "#B2B0E8", // Azul muy claro para fondos
  success: "#52c41a",      // Verde para estados de éxito
  error: "#d32f2f",        // Rojo para estados de error
  warning: "#faad14",      // Amarillo para advertencias
} as const;

// ===================== Tipos =====================
/**
 * Props del componente principal CustomCard
 */
interface RootProps {
  /** Estado visual de la tarjeta que afecta el color del borde izquierdo */
  status?: "default" | "success" | "warning" | "error";
  /** Ancho de la tarjeta en píxeles. Por defecto: 580px para layout de 2 columnas */
  width?: number;
  /** Padding interno de la tarjeta en píxeles. Por defecto: 24px */
  padding?: number;
  /** Clase CSS adicional para personalización */
  className?: string;
  /** Estilos CSS adicionales */
  style?: CSSProperties;
  /** Componentes hijos (Header, Description, Body, Actions) */
  children: ReactNode;
  /** Acción realizada al darle click a la card */
  onClick?: ()=>void;
}

/**
 * Props del componente Header
 */
interface HeaderProps {
  /** Icono a mostrar (generalmente de @ant-design/icons) */
  icon: ReactNode;
  /** Título principal de la tarjeta */
  title: ReactNode;
}

/**
 * Props del componente Description
 */
interface DescriptionProps {
  /** Texto descriptivo que aparece bajo el título */
  children: ReactNode;
}

/**
 * Props del componente Body
 */
interface BodyProps {
  /** Contenido adicional (listas, datos, texto extendido) */
  children: ReactNode;
}

/**
 * Props del componente Actions
 */
interface ActionsProps {
  /** Botones de acción (máximo 3, se truncan automáticamente) */
  children: ReactNode;
}

// ===================== Identificadores de componentes =====================
/**
 * Símbolos únicos para identificar cada tipo de componente hijo
 * Utilizado por el patrón Compound Component para distinguir elementos
 */
const componentIds = {
  header: Symbol("CustomCard.Header"),
  description: Symbol("CustomCard.Description"),
  body: Symbol("CustomCard.Body"),
  actions: Symbol("CustomCard.Actions"),
};

/**
 * Interfaz para componentes que contienen un identificador único
 */
interface ComponentWithId {
  $id: symbol;
}

/**
 * Función utilitaria para verificar si un hijo es de un tipo específico
 * @param child - Elemento hijo de React a verificar
 * @param id - Símbolo identificador del tipo de componente
 * @returns true si el hijo es del tipo especificado
 */
function isComponentType(child: React.ReactNode, id: symbol): boolean {
  if (!React.isValidElement(child)) return false;
  return (child.type as unknown as ComponentWithId)?.$id === id;
}

// ===================== Subcomponentes =====================

/**
 * Header - Componente de encabezado de la tarjeta
 * 
 * Muestra un icono y título principal. Es el único componente obligatorio.
 * 
 * @example
 * ```tsx
 * <CustomCard.Header 
 *   icon={<FileTextOutlined />} 
 *   title="Documento Importante" 
 * />
 * ```
 */
const Header: React.FC<HeaderProps> & { $id?: symbol } = ({ icon, title }) => (
  <Space align="center" size={16} style={{ width: "100%", minWidth: 0 }}>
    {/* Contenedor del icono con estilo consistente */}
    <div
      style={{
        width: 48,
        height: 48,
        display: "grid",
        placeItems: "center",
        borderRadius: 12,
        background: PALETTE.veryLightBlue,
        color: PALETTE.secondary,
        fontSize: 20,
      }}
    >
      {icon}
    </div>
    {/* Título con tipografía optimizada */}
    <Title 
      level={4} 
      style={{ 
        margin: 0, 
        color: PALETTE.primary, 
        fontWeight: 600, 
        whiteSpace: "normal", 
        wordBreak: "break-word" 
      }}
    >
      {title}
    </Title>
  </Space>
);
Header.$id = componentIds.header;

/**
 * Description - Componente de descripción
 * 
 * Texto explicativo que aparece bajo el título.
 * 
 * @example
 * ```tsx
 * <CustomCard.Description>
 *   Archivo procesado correctamente y listo para descarga
 * </CustomCard.Description>
 * ```
 */
const Description: React.FC<DescriptionProps> & { $id?: symbol } = ({ children }) => (
  <Text 
    style={{ 
      display: "block", 
      marginTop: 8, 
      marginBottom: 8,
      color: PALETTE.lightBlue, 
      fontSize: 15,
      lineHeight: 1.4
    }}
  >
    {children}
  </Text>
);
Description.$id = componentIds.description;

/**
 * Body - Componente de contenido adicional
 * 
 * Espacio para contenido extendido como listas, datos, o información adicional.
 * 
 * @example
 * ```tsx
 * <CustomCard.Body>
 *   <ul>
 *     <li>Configurar permisos de acceso</li>
 *     <li>Gestionar usuarios y roles</li>
 *   </ul>
 * </CustomCard.Body>
 * ```
 */
const Body: React.FC<BodyProps> & { $id?: symbol } = ({ children }) => (
  <div 
    style={{ 
      marginTop: 4,
      marginBottom: 8,
      fontSize: 14,
      lineHeight: 1.5,
      color: '#666'
    }}
  >
    {children}
  </div>
);
Body.$id = componentIds.body;

/**
 * Actions - Componente de acciones
 * 
 * Panel lateral con botones de acción. Los botones se muestran con ancho completo
 * y se limitan automáticamente a máximo 3 elementos.
 * 
 * @example
 * ```tsx
 * <CustomCard.Actions>
 *   <Button type="primary" icon={<EditOutlined />}>Editar</Button>
 *   <Button icon={<EyeOutlined />}>Ver</Button>
 *   <Button danger icon={<DeleteOutlined />}>Eliminar</Button>
 * </CustomCard.Actions>
 * ```
 */
const Actions: React.FC<ActionsProps> & { $id?: symbol } = ({ children }) => {
  const childArray = React.Children.toArray(children);
  const limitedChildren = childArray.slice(0, 3); // Máximo 3 acciones
  
  return (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      {limitedChildren.map((child, index) => (
        <div key={index} style={{ width: '100%' }}>
          {React.isValidElement(child) 
            ? React.cloneElement(child, { 
                style: { width: '100%', justifyContent: 'flex-start' } 
              } as React.HTMLAttributes<HTMLElement>)
            : child
          }
        </div>
      ))}
    </Space>
  );
};
Actions.$id = componentIds.actions;

// ===================== Componente principal =====================

/**
 * CustomCard - Componente principal de tarjeta
 * 
 * Implementa el patrón Compound Component para máxima flexibilidad.
 * Proporciona layout consistente con dimensiones fijas y estados visuales.
 * 
 * Características:
 * - Altura fija de 240px para consistencia visual
 * - Ancho por defecto de 580px (optimizado para layout de 2 columnas)
 * - Estados visuales: default, success, warning, error
 * - Layout responsivo con panel de acciones opcional
 * - Header obligatorio, otros componentes opcionales
 * 
 * @param props - Propiedades del componente
 * @returns Componente de tarjeta renderizado
 * 
 * @example Uso básico
 * ```tsx
 * <CustomCard>
 *   <CustomCard.Header icon={<FileIcon />} title="Mi Documento" />
 *   <CustomCard.Description>
 *     Descripción del contenido
 *   </CustomCard.Description>
 * </CustomCard>
 * ```
 * 
 * @example Con todas las opciones
 * ```tsx
 * <CustomCard status="success" width={600}>
 *   <CustomCard.Header icon={<CheckIcon />} title="Proceso Completado" />
 *   <CustomCard.Description>
 *     La operación se ejecutó correctamente
 *   </CustomCard.Description>
 *   <CustomCard.Body>
 *     <p>Detalles adicionales del proceso</p>
 *   </CustomCard.Body>
 *   <CustomCard.Actions>
 *     <Button type="primary">Continuar</Button>
 *     <Button>Ver Log</Button>
 *   </CustomCard.Actions>
 * </CustomCard>
 * ```
 */
const Root: React.FC<RootProps> & {
  Header: typeof Header;
  Description: typeof Description;
  Body: typeof Body;
  Actions: typeof Actions;
} = ({ status = "default", width = 580, padding = 24, className, style, children, onClick }) => {
  // Extraer componentes hijos usando el sistema de identificación
  const allChildren = React.Children.toArray(children);
  const header = allChildren.find((child) => isComponentType(child, componentIds.header));
  const description = allChildren.find((child) => isComponentType(child, componentIds.description));
  const body = allChildren.find((child) => isComponentType(child, componentIds.body));
  const actions = allChildren.find((child) => isComponentType(child, componentIds.actions));

  // Validar que Header sea obligatorio
  if (!header) {
    throw new Error("CustomCard: Header es obligatorio. Asegúrate de incluir <CustomCard.Header> como hijo directo.");
  }

  const hasActions = Boolean(actions);
  // Asegurar ancho mínimo cuando hay acciones para evitar layout comprimido
  const cardWidth = hasActions ? Math.max(width, 580) : width;
  const cardHeight = 240; // Altura fija para consistencia en grids

  // Determinar color del borde izquierdo según el status
  const accentColor = {
    success: PALETTE.success,
    warning: PALETTE.warning,
    error: PALETTE.error,
    default: PALETTE.secondary,
  }[status];

  const hoverable = !!onClick
  if (!hoverable) {
    style = {
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      ...style
    }
  }
  return (
    <Card
      className={className}
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: 14,
        background: "#fff",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      bodyStyle={{ padding: 0, height: "100%" }}
      onClick={onClick}
      hoverable={hoverable}
    >
      {/* Borde izquierdo de color según status */}
      <div 
        style={{ 
          position: "absolute", 
          left: 0, 
          top: 0, 
          bottom: 0, 
          width: 5, 
          background: accentColor 
        }} 
      />
      
      <Row align="top" wrap={false} style={{ width: "100%", height: "100%" }}>
        {/* Área de contenido principal */}
        <Col flex="auto" style={{ padding, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Header y Description en contenedor fijo */}
          <div style={{ flex: '0 0 auto' }}>
            {header}
            {description}
          </div>
          {/* Body en contenedor expandible */}
          {body && (
            <div style={{ flex: '1 1 auto', marginTop: 4 }}>
              {body}
            </div>
          )}
        </Col>
        
        {/* Panel de acciones lateral (solo si existe) */}
        {hasActions && (
          <>
            {/* Separador visual */}
            <Col flex="0 0 1px">
              <div style={{ width: 1, height: "100%", background: "#E6E8EF" }} />
            </Col>
            {/* Contenedor de acciones con ancho fijo */}
            <Col flex="260px" style={{ padding }}>
              {actions}
            </Col>
          </>
        )}
      </Row>
    </Card>
  );
};

// ===================== Exportaciones =====================

// Asignar subcomponentes al componente principal
Root.Header = Header;
Root.Description = Description;
Root.Body = Body;
Root.Actions = Actions;

/**
 * CustomCard - Componente de tarjeta modular exportado
 * 
 * @see {@link Root} Para documentación completa del componente
 */
export const CustomCard = Root;

/**
 * Exportación por defecto del componente CustomCard
 * 
 * @example
 * ```tsx
 * import CustomCard from './components/shared/CustomCard';
 * 
 * function MyComponent() {
 *   return (
 *     <CustomCard status="success">
 *       <CustomCard.Header icon={<CheckIcon />} title="Éxito" />
 *       <CustomCard.Description>
 *         Operación completada
 *       </CustomCard.Description>
 *     </CustomCard>
 *   );
 * }
 * ```
 */
export default CustomCard;