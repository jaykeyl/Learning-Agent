import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, theme } from "antd";
import PageTemplate from "../../components/PageTemplate";
import TestModal from "../../components/tests/TestModal";
import TestSummaryModal from "../../components/tests/TestSummaryModal";
import TimerDisplay from "../../components/tests/Timer";
import { useStudentTest } from "../../hooks/useStudentTest";
import TestQuestion from "../../components/tests/TestQuestion";
import TrueOrFalseQuestion from "../../components/tests/TrueOrFalseQuestion";

export default function Test() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { id } = useParams();
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    "Accediendo a la base de datos...",
    "Cargando preguntas...",
    "Preparando interfaz...",
    "Inicializando lógica...",
    "Verificando dificultad..."
  ];

  useEffect(() => {
    if (!isExamStarted) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isExamStarted]);

  const {
    isTestModalOpen,
    closeTestModal,
    startExam,
    questionCount,
    currentQuestion,
    questionData,
    loading,
    error,
    answers,
    nextQuestion,
    recordAnswer,
    timeLeft,
    totalTime,
    finishExam,
    modalProps,
    getClampedTimeTaken
  } = useStudentTest("Moda", () => setShowSummary(true));

  const handleStartExam = (count: number) => {
    startExam(count);
    setIsExamStarted(true);
  };

  const handleNextQuestion = (isCorrect: boolean) => {
    recordAnswer(isCorrect);
    if (currentQuestion < questionCount) {
      nextQuestion();
    } else {
      finishExam();
    }
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    setIsExamStarted(false);
    navigate(`/student/classes/${id}/reinforcement`);
  };

  return (
    <PageTemplate
      title="Exams"
      subtitle={
        isExamStarted && questionCount
          ? `Question ${currentQuestion} of ${questionCount}`
          : "Soon you will find quizzes and resources to practice"
      }
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Classes", href: "/student/classes" },
        { label: "Reinforcement", href: `/student/classes/${id}/reinforcement` },
        { label: "Exams" },
      ]}
    >
      {!isExamStarted && (
        <TestModal
          open={isTestModalOpen}
          onClose={closeTestModal}
          onSelectDifficulty={handleStartExam}
          {...modalProps}
        />
      )}

      {isExamStarted && (
        <>
          <TimerDisplay timeLeft={timeLeft} totalTime={totalTime} />
          <div style={{ width: "100%", minHeight: 300, position: "relative" }}>
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
                  padding: token.paddingXL,
                  gap: token.marginXL
                }}
              >
                <div className="puzzle-loader">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="piece" />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: token.fontSizeHeading3,
                    fontWeight: token.fontWeightStrong,
                    color: token.colorPrimary,
                    textAlign: "center",
                    animation: "fadePulse 1.5s infinite ease-in-out"
                  }}
                >
                  {loadingMessages[loadingMessageIndex]}
                </div>
                <style>
                  {`
                    .puzzle-loader {
                      display: grid;
                      grid-template-columns: repeat(2, 48px);
                      grid-template-rows: repeat(2, 48px);
                      gap: 16px;
                    }
                    .piece {
                      width: 48px;
                      height: 48px;
                      background-color: ${token.colorPrimary};
                      border-radius: 10px;
                      animation: puzzleBounce 1.2s infinite ease-in-out;
                    }
                    .piece:nth-child(1) { animation-delay: 0s; }
                    .piece:nth-child(2) { animation-delay: 0.2s; }
                    .piece:nth-child(3) { animation-delay: 0.4s; }
                    .piece:nth-child(4) { animation-delay: 0.6s; }

                    @keyframes puzzleBounce {
                      0%, 100% { transform: scale(1); opacity: 1; }
                      50% { transform: scale(1.3); opacity: 0.6; }
                    }

                    @keyframes fadePulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                  `}
                </style>
              </div>
            )}
            {!loading && error && (
              <Alert message={error} type="error" showIcon />
            )}
            {!loading && questionData && (
              questionData.type === "truefalse" ? (
                <TrueOrFalseQuestion
                  questionData={questionData}
                  onNext={handleNextQuestion}
                />
              ) : (
                <TestQuestion
                  questionData={questionData}
                  onNext={handleNextQuestion}
                />
              )
            )}
          </div>
        </>
      )}

      {showSummary && (
        <TestSummaryModal
          open={showSummary}
          onClose={handleCloseSummary}
          answers={answers}
          questionCount={questionCount}
          timeTaken={getClampedTimeTaken()}
        />
      )}
    </PageTemplate>
  );
}
