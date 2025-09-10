import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import TestModal from "../../components/tests/TestModal"; 
import { useStudentTest } from "../../hooks/useStudentTest";

import TestRunner from "../../components/tests/TestRunner"; 


export default function Test() {
  const navigate = useNavigate();
  const { isTestModalOpen, closeTestModal, startExam, questionCount } = useStudentTest();
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);


  const handleStartExam = (count: number) => {
    startExam(count);
    setIsExamStarted(true);
    setCurrentQuestion(1);
  };

  const handleNextQuestion = () => {
    const total = questionCount || 0;
    if (currentQuestion < total) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      navigate("/reinforcement");
    }
  };

  // const handleTimeUp = () => {
  //   navigate("/reinforcement");
  // };

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
        { label: "Exámenes" },
      ]}
    >
      {!isExamStarted && (
        <TestModal
          open={isTestModalOpen}
          onClose={closeTestModal}
          onSelectDifficulty={handleStartExam}
        />
      )}


      {isExamStarted && (
        <div style={{ width: "100%", minHeight: 300 }}>
          <TestRunner onAnswered={handleNextQuestion} />
        </div>

      )}
    </PageTemplate>
  );
}
