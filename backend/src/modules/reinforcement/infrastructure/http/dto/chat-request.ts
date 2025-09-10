import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequest {
  @IsNotEmpty({ message: 'La pregunta es obligatoria' })
  @IsString({ message: 'La pregunta debe ser texto' })
  question!: string;
}
