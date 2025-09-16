import { useState } from "react";
import { Button, Modal } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";

import PageTemplate from "../../components/PageTemplate";
import { useThemeStore } from "../../store/themeStore";

import InterviewModal from "../../components/interview/InterviewModal";
import InterviewFeedbackModal from "../../components/interview/InterviewFeedbackModal";
import OpenQuestion from "../../components/interview/OpenQuestion";
import TeoricQuestion from "../../components/interview/TeoricQuestion";
import MultipleQuestion from "../../components/interview/MultipleQuestion";

import { useStudentInterview } from "../../hooks/useStudentInterview";

const InterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useThemeStore();

  const {
    isInterviewModalOpen,
    closeInterviewModal,
    startExam,
    questionType,
    currentQuestion,
    questionCount,
    nextQuestion,
  } = useStudentInterview();

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleFinish = () => {
    setIsFinishModalOpen(true);
  };

  const handleConfirmFinish = () => {
    setIsFinishModalOpen(false);
    setShowFeedback(true);
    navigate(`/student/classes/${id}/reinforcement`);
  };

  const handleDownloadFeedback = () => {
    console.log("Descargando feedback...");
  };

  const renderQuestion = () => {
    switch (questionType) {
      case "multiple":
        return <MultipleQuestion onNext={nextQuestion} />;
      case "truefalse":
        return <TeoricQuestion onNext={nextQuestion} />;
      default:
        return <OpenQuestion onNext={nextQuestion} />;
    }
  };

  return (
    <>
      <PageTemplate
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Classes", href: "/student/classes" },
          { label: "Reinforcement", href: `/student/classes/${id}/reinforcement` },
          { label: "Interview" },
        ]}
        title={
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>Entrevista</span>
            {questionCount > 0 && (
              <span
                style={{
                  fontSize: 14,
                  color:
                    theme === "dark"
                      ? "rgba(255,255,255,0.65)"
                      : "rgba(0,0,0,0.65)",
                  fontWeight: 500,
                  marginTop: 4,
                }}
              >
                Pregunta {currentQuestion} de {questionCount}
              </span>
            )}
          </div>
        }
        actions={
          questionCount > 0 && (
            <Button
              icon={<CloseOutlined />}
              onClick={handleFinish}
              type="primary"
              className="bg-primary text-white hover:bg-primary/90"
            >
              Finalizar
            </Button>
          )
        }
      >
        {questionCount > 0 && renderQuestion()}
      </PageTemplate>

      <InterviewModal
        open={isInterviewModalOpen}
        onClose={closeInterviewModal}
        onSelectDifficulty={startExam}
      />

      <Modal
        title="Finalizar Entrevista"
        open={isFinishModalOpen}
        onOk={handleConfirmFinish}
        onCancel={() => setIsFinishModalOpen(false)}
        okText="Sí, finalizar"
        cancelText="No, continuar"
      >
        <p>¿Estás seguro de que quieres finalizar la entrevista?</p>
        <p>Perderás el progreso actual.</p>
      </Modal>

      <InterviewFeedbackModal
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        onDownload={handleDownloadFeedback}
      />
    </>
  );
};

export default InterviewPage;
