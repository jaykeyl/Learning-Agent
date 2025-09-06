import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import { TestModal } from "../../components/tests/TestModal";
import { useStudentTest } from "../../hooks/useStudentTest";
import TestQuestion from "../../components/tests/TestQuestion";
import TrueOrFalseQuestion from "../../components/tests/TrueOrFalseQuestion";

export default function Test() {
  const navigate = useNavigate();
  const { isTestModalOpen, closeTestModal, startExam, questionCount } = useStudentTest();
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [questionType, setQuestionType] = useState<"multiple" | "truefalse">("multiple");

  const randomizeType = () => {
    const types: Array<"multiple" | "truefalse"> = ["multiple", "truefalse"];
    setQuestionType(types[Math.floor(Math.random() * types.length)]);
  };

  const handleStartExam = (count: number) => {
    startExam(count);
    setIsExamStarted(true);
    setCurrentQuestion(1);
    randomizeType();
  };

  const handleNextQuestion = () => {
    if (currentQuestion < (questionCount || 0)) {
      setCurrentQuestion(prev => prev + 1);
      randomizeType();
    } else {
      navigate("/reinforcement");
    }
  };

  return (
    <PageTemplate
      title="Exámenes"
      subtitle={
        isExamStarted && questionCount
          ? `Pregunta ${currentQuestion} de ${questionCount}`
          : "Próximamente encontrarás cuestionarios y recursos para practicar"
      }
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Refuerzo", href: "/reinforcement" },
        { label: "Exámenes" }
      ]}
    >
      {!isExamStarted && (
        <TestModal
          open={isTestModalOpen}
          onClose={closeTestModal}
          onSelectDifficulty={handleStartExam}
        />
      )}

      {isExamStarted && questionType === "multiple" && (
        <TestQuestion onNext={handleNextQuestion} />
      )}

      {isExamStarted && questionType === "truefalse" && (
        <TrueOrFalseQuestion onNext={handleNextQuestion} />
      )}
    </PageTemplate>
  );
}
