import { Modal, Typography } from 'antd';

export type PromptViewerProps = {
  open: boolean;
  onClose: () => void;
};

export function PromptViewer({ open, onClose }: PromptViewerProps) {
  return (
    <Modal
      title=" Prompt Viewer – Generador de preguntas"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Typography.Paragraph>
        Este texto sirve para que una inteligencia artificial cree preguntas de examen automáticamente.
         Tú solo tienes que copiarlo y cambiar unas palabras muy sencillas.
      </Typography.Paragraph>

      <Typography.Paragraph strong>Cómo usarlo (guía fácil):</Typography.Paragraph>
      <ol style={{ paddingLeft: '1.2em' }}>
        <li>Copia el texto completo que ves abajo.</li>
        <li>Pégalo en la inteligencia artificial (ejemplo: ChatGPT).</li>
        <li>
          Cambia solo lo que está entre llaves <code>{`{{ }}`}</code>:
          <ul>
            <li><code>{`{{subject}}`}</code> → Materia o tema (ej. Matemáticas, Historia).</li>
            <li><code>{`{{level}}`}</code> → Nivel (ej. básico, intermedio, avanzado).</li>
            <li><code>{`{{numQuestions}}`}</code> → Número de preguntas (ej. 5, 10).</li>
            <li><code>{`{{format}}`}</code> → Formato de salida: "JSON" o "texto".</li>
          </ul>
        </li>
        
        <li>Haz clic en enviar y listo </li>
      </ol>

      <Typography.Paragraph strong>Texto para copiar (Prompt):</Typography.Paragraph>
      <Typography.Paragraph>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{`
You are an assessment generator.

Subject: {{subject}}
Level: {{level}}
Questions: {{numQuestions}}

Output format: {{format}}.
If JSON, produce:

{
  "subject": "{{subject}}",
  "level": "{{level}}",
  "questions": [
    {
      "id": "q1",
      "question": "Escribe una pregunta clara de opción múltiple para {{subject}} en nivel {{level}}.",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "Explicación corta."
    }
  ]
}

Constraints:
- Solo una respuesta correcta por pregunta.  
- Las opciones incorrectas deben sonar creíbles.  
- No repitas preguntas.
        `}</pre>
      </Typography.Paragraph>

      <Typography.Paragraph>
        Ejemplo lleno:
        <pre>{`
Subject: Matemáticas
Level: Básico
Questions: 5
Output format: texto
        `}</pre>
         Con esto la IA generará 5 preguntas de matemáticas nivel básico en formato de texto.
      </Typography.Paragraph>
    </Modal>
  );
}
