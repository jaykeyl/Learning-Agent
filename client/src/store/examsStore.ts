import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeneratedQuestion } from '../services/exams.service';

export type ExamStatus = 'published' | 'draft' | 'scheduled';
export type ExamVisibility = 'visible' | 'hidden';

export interface ExamSummary {
  id: string;
  title: string;
  className?: string;
  status: ExamStatus;
  visibility: ExamVisibility;
  totalQuestions: number;
  difficulty?: string;
  counts: {
    multiple_choice: number;
    true_false: number;
    open_analysis: number;
    open_exercise: number;
  };
  createdAt: string;
  publishedAt?: string;
}

type AddFromQuestionsArgs = {
  title: string;
  className?: string;
  questions: GeneratedQuestion[];
  publish?: boolean;
  scheduleAt?: string;
};

export interface ExamsState {
  exams: ExamSummary[];
  addFromQuestions: (args: AddFromQuestionsArgs) => ExamSummary;
  updateExam: (id: string, args: AddFromQuestionsArgs) => ExamSummary;
  toggleVisibility: (id: string) => void;
  setVisibility: (id: string, v: ExamVisibility) => void;
  setStatus: (id: string, status: ExamStatus, publishedAt?: string) => void;
  removeExam: (id: string) => void;
}

function buildSummary({ title, className, questions, publish, scheduleAt }: AddFromQuestionsArgs): ExamSummary {
  const counts = {
    multiple_choice: questions.filter(q => q.type === 'multiple_choice').length,
    true_false: questions.filter(q => q.type === 'true_false').length,
    open_analysis: questions.filter(q => q.type === 'open_analysis').length,
    open_exercise: questions.filter(q => q.type === 'open_exercise').length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const now = new Date().toISOString();
  let status: ExamStatus = 'draft';
  let publishedAt: string | undefined = undefined;
  if (publish) {
    status = 'published';
    publishedAt = now;
  } else if (scheduleAt) {
    status = 'scheduled';
    publishedAt = scheduleAt;
  }
  return {
    id: `exam_${Date.now()}`,
    title: title || 'Examen sin título',
    className,
    difficulty: 'Media',
    status,
    visibility: 'visible',
    totalQuestions: total,
    counts,
    createdAt: now,
    publishedAt,
  };
}

export const useExamsStore = create(
  persist<ExamsState>(
    (set, get) => ({
      exams: [],
      addFromQuestions: (args) => {
        const summary = buildSummary(args);
        set({ exams: [summary, ...get().exams] });
        return summary;
      },
      updateExam: (id, args) => {
        const oldExam = get().exams.find(e => e.id === id);
        const updatedSummary = {
          ...buildSummary(args),
          id,
          createdAt: oldExam?.createdAt || new Date().toISOString(),
          status: oldExam?.status || 'draft',
          visibility: oldExam?.visibility || 'visible',
          publishedAt: oldExam?.publishedAt
        };
        set({
          exams: get().exams.map(e => e.id === id ? updatedSummary : e)
        });
        return updatedSummary;
      },
      toggleVisibility: (id) => {
        set({
          exams: get().exams.map(e =>
            e.id === id ? { ...e, visibility: e.visibility === 'visible' ? 'hidden' : 'visible' } : e
          ),
        });
      },
      setVisibility: (id, v) => {
        set({
          exams: get().exams.map(e =>
            e.id === id ? { ...e, visibility: v } : e
          ),
        });
      },
      setStatus: (id, status, publishedAt) => {
        set({
          exams: get().exams.map(e =>
            e.id === id ? { ...e, status, publishedAt } : e
          ),
        });
      },
      removeExam: (id) => {
        set({ exams: get().exams.filter(e => e.id !== id) });
      },
    }),
    { name: 'exams-storage' }
  )
);
