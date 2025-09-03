import { IsNotEmpty, IsString } from 'class-validator';

export class ChatAnswer {
  @IsNotEmpty({ message: 'La pregunta es obligatoria' })
  @IsString({ message: 'La pregunta debe ser texto' })
  question: string;
  @IsNotEmpty({ message: 'La respuesta es obligatoria' })
  @IsString({ message: 'La respuesta debe ser texto' })
  answer: string;
  @IsNotEmpty({ message: 'el topico es obligatorio' })
  @IsString({ message: 'el topico debe ser texto' })
  topic: string;
}
