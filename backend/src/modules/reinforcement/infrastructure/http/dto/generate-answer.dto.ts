import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  role!: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty({ message: 'El contenido es obligatorio.' })
  content!: string;

  @IsOptional()
  timestamp?: Date;
}

class ModelOptionsDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del modelo es obligatorio.' })
  name!: string;

  @IsOptional()
  @IsString()
  version?: string;
}

class ChatOptionsDto {
  @ValidateNested()
  @Type(() => ModelOptionsDto)
  model!: ModelOptionsDto;

  @IsNumber()
  @Min(0, { message: 'Temperature debe ser ≥ 0.' })
  @Max(2, { message: 'Temperature debe ser ≤ 2.' })
  temperature!: number;

  @IsNumber()
  @Min(0, { message: 'Top_p debe ser ≥ 0.' })
  @Max(1, { message: 'Top_p debe ser ≤ 1.' })
  top_p!: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Max_tokens debe ser ≥ 1.' })
  max_tokens?: number;
}

export class GenerateAnswerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @ValidateNested()
  @Type(() => ChatOptionsDto)
  options!: ChatOptionsDto;

  @IsOptional()
  @IsString()
  format?: 'text' | 'markdown' | 'json';
}
