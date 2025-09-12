import { useEffect, useState } from "react";
import { Spin, Alert, Button } from "antd";
import TestQuestion from "./TestQuestion";
import TrueOrFalseQuestion from "./TrueOrFalseQuestion";

type ServerResp = {
  result: "options_generated";
  question: string;
  options: string[];
  id: string;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Props {
  onAnswered?: () => void;
}

export default function TestRunner({ onAnswered }: Props): JSX.Element {
  const [item, setItem] = useState<ServerResp | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/exams-chat/generate-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? " - " + text : ""}`);
      }

      const data = await res.json().catch(() => null);

      if (!data || typeof data.question !== "string" || !Array.isArray(data.options)) {
        throw new Error("Respuesta inválida del servidor (esperaba question + options).");
      }

      data.options = data.options.map((o: any) => String(o));
      data.question = String(data.question);

      setItem(data as ServerResp);
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido al pedir la pregunta");
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestion();
  }, []);

  const handleNext = () => {
    if (onAnswered) onAnswered();
    fetchQuestion();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Alert message="Error al cargar la pregunta" description={error} type="error" showIcon />
        <div style={{ marginTop: 12 }}>
          <Button onClick={fetchQuestion}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: 16 }}>
        <Alert message="No hay pregunta cargada" type="info" showIcon />
        <div style={{ marginTop: 12 }}>
          <Button onClick={fetchQuestion}>Cargar pregunta</Button>
        </div>
      </div>
    );
  }

  if (item.options.length === 2) {
    return <TrueOrFalseQuestion question={item.question} onNext={handleNext} />;
  }

  return <TestQuestion question={item.question} options={item.options} onNext={handleNext} />;
}
