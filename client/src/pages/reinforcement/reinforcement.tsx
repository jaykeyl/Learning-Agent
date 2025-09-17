import { useState } from "react";
import { Modal, Space, Button } from "antd";
import { BookOutlined } from "@ant-design/icons";
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
      { id: "test", title: "Exams", description: "Preparation for exams and evaluations" },
      { id: "interview", title: "Interviews", description: "Preparation for job interviews" },
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
        Syllabus
      </Button>
    </Space>
  );

  return (
    <PageTemplate
      title="Reinforcement"
      subtitle="Select a category to practice"
      actions={headerActions}
      breadcrumbs={[
        { label: "Home", href: "/" }, 
        { label: "Classes", href: "/student/classes" }, 
        { label: "Reinforcement" }
      ]}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3">
          <div className="mb-2">
            <ProgressCard />
          </div>
          <div className="pt-2">
            <CourseCards courses={studentActivities.courses} />
          </div>
        </div>
      </div>

      <ChatFloatButton onClick={handleChatClick} />

      <Modal
        title="Feature in development"
        open={isModalOpen}
        onOk={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
        footer={[<Button key="back" onClick={() => setIsModalOpen(false)}>Close</Button>]}
      >
        <p>This feature is still in development and will be available soon.</p>
      </Modal>

      <ChatModal isChatOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </PageTemplate>
  );
}
