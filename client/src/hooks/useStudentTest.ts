import { useState, useEffect, useCallback } from "react";

export function useStudentTest() {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [questionType, setQuestionType] = useState<"multiple" | "truefalse">("multiple");

  const openTestModal = useCallback(() => {
    setIsTestModalOpen(true);
  }, []);

  const closeTestModal = useCallback(() => {
    setIsTestModalOpen(false);
  }, []);

  const randomizeType = useCallback(() => {
    const types: Array<"multiple" | "truefalse"> = ["multiple", "truefalse"];
    setQuestionType(types[Math.floor(Math.random() * types.length)]);
  }, []);

  const startExam = useCallback((count: number) => {
    setQuestionCount(count);
    setCurrentQuestion(1);
    randomizeType();
    setIsTestModalOpen(false);
  }, [randomizeType]);

  const nextQuestion = useCallback(() => {
    if (currentQuestion < questionCount) {
      setCurrentQuestion(prev => prev + 1);
      randomizeType();
    } else {
      console.log("Examen finalizado");
    }
  }, [currentQuestion, questionCount, randomizeType]);

  useEffect(() => {
    openTestModal();
  }, [openTestModal]);

  return {
    isTestModalOpen,
    questionCount,
    currentQuestion,
    questionType,
    openTestModal,
    closeTestModal,
    startExam,
    nextQuestion
  };
}
