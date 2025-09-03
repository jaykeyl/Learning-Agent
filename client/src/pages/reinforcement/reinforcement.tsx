import { useState } from "react";
import { Modal, Space, Row, Button } from "antd";
import { BookOutlined, FileTextOutlined } from "@ant-design/icons";
import { ProgressCard } from "../../components/reinforcement/ProgressCard";
import { CourseCards } from "../../components/reinforcement/CourseCards";
import { ChatModal } from "../../components/reinforcement/ChatModal";
import { useChatLogic } from "../../hooks/useChatLogic";
import { ChatFloatButton } from "../../components/reinforcement/ChatFloatButton";
import PageTemplate from "../../components/PageTemplate";

export function Reinforcement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isChatOpen, handleChatClick, setIsChatOpen } = useChatLogic();

  const studentActivities = {
    courses: [
      { id: "exam", title: "Exámenes", description: "Preparación para exámenes y evaluaciones" },
      { id: "interview", title: "Entrevistas", description: "Preparación para entrevistas de trabajo" },
    ],
  };

  const headerActions = (
    <Space wrap>
      <Button
        icon={<BookOutlined />}
        onClick={() => setIsModalOpen(true)}
        size="middle"
        className="!bg-[#1A2A80] !text-white !border-none h-9 rounded-lg font-medium px-4 shadow-md transition-all duration-200 ease-in-out hover:!bg-[#3B38A0] hover:shadow-xl hover:-translate-y-1"
      >
        Sílabo
      </Button>
      <Button
        icon={<FileTextOutlined />}
        onClick={() => setIsModalOpen(true)}
        size="middle"
        className="!bg-[#1A2A80] !text-white !border-none h-9 rounded-lg font-medium px-4 shadow-md transition-all duration-200 ease-in-out hover:!bg-[#3B38A0] hover:shadow-xl hover:-translate-y-1"
      >
        Documentos
      </Button>
    </Space>
  );

  return (
    <PageTemplate
      title="Refuerzo"
      subtitle="Selecciona una categoría para practicar"
      actions={headerActions}
      breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Refuerzo" }]}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3">
          <div className="mb-2"> {/* margen inferior más compacto */}
            <ProgressCard />
          </div>
          <div className="-mt-2"> {/* margen superior negativo para subir las CourseCards */}
            <CourseCards courses={studentActivities.courses} />
          </div>
        </div>
      </div>

      <ChatFloatButton onClick={handleChatClick} />

      <Modal
        title="Funcionalidad en desarrollo"
        open={isModalOpen}
        onOk={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
        footer={[<Button key="back" onClick={() => setIsModalOpen(false)}>Cerrar</Button>]}
      >
        <p>Esta funcionalidad aún está en desarrollo y estará disponible pronto.</p>
      </Modal>

      <ChatModal isChatOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </PageTemplate>
  );
}
