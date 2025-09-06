import { useState, useCallback } from 'react';

export type InterviewType = 'open' | 'teoric' | 'multiple';

interface UseInterviewFlowResult {
  currentType: InterviewType | undefined;
  isModalOpen: boolean;
  next: () => void;
  finish: () => void;
  confirmFinish: () => boolean;
  setIsModalOpen: (open: boolean) => void;
}

export default function useInterviewFlow(
  initialQuestions: InterviewType[] = []
): UseInterviewFlowResult {
  const [order] = useState<InterviewType[]>(() => {
    if (initialQuestions.length === 0) return [];
    const arr = [...initialQuestions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const [index, setIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const next = useCallback(() => {
    if (order.length === 0) return;
    setIndex(prev => (prev + 1) % order.length);
  }, [order]);

  const finish = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const confirmFinish = useCallback(() => {
    setIsModalOpen(false);
    return true;
  }, []);

  return {
    currentType: order[index],
    isModalOpen,
    next,
    finish,
    confirmFinish,
    setIsModalOpen,
  };
}
