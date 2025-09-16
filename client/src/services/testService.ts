import { useState, useCallback, useEffect } from "react";

export type QuestionType = "multiple" | "truefalse";

export interface QuestionData {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function fetchQuestionFromAI(context: string): Promise<QuestionData> {
  const res = await fetch(`${API_BASE}/exams-chat/generate-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();
  return {
    id: data.id ?? crypto.randomUUID(),
    type: data.options.length === 2 ? "truefalse" : "multiple",
    question: String(data.question),
    options: data.options.map((o: any) => String(o)),
    correctIndex: 0
  };
}

export async function fetchMockQuestion(): Promise<QuestionData> {
  return {
    id: "q1",
    type: "multiple",
    question: "¿Cuál es el planeta más cercano al Sol?",
    options: ["Mercurio", "Venus", "Tierra", "Marte"],
    correctIndex: 0
  };
}

export async function fetchQuestion(context: string): Promise<QuestionData> {
  try {
    return await fetchQuestionFromAI(context);
  } catch {
    return await fetchMockQuestion();
  }
}

export function useQuestionLoader(initialContext: string) {
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ctx?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = await fetchQuestion(ctx ?? initialContext);
      setQuestionData(q);
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido al pedir la pregunta");
      setQuestionData(null);
    } finally {
      setLoading(false);
    }
  }, [initialContext]);

  useEffect(() => {
    load(initialContext);
  }, [load, initialContext]);

  return { questionData, loading, error, reload: load };
}
