import { IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class DistributionDto {
  @IsInt() @Min(0, { message: 'multiple_choice debe ser ≥ 0.' })
  multiple_choice!: number;

  @IsInt() @Min(0, { message: 'true_false debe ser ≥ 0.' })
  true_false!: number;

  @IsInt() @Min(0, { message: 'open_analysis debe ser ≥ 0.' })
  open_analysis!: number;

  @IsInt() @Min(0, { message: 'open_exercise debe ser ≥ 0.' })
  open_exercise!: number;
}

export class CreateExamDto {
  @IsString()
  @IsNotEmpty({ message: 'Materia es obligatoria.' })
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsIn(['fácil', 'medio', 'difícil'], { message: 'Dificultad inválida.' })
  difficulty!: 'fácil' | 'medio' | 'difícil';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reference?: string;

  @IsInt()
  @IsPositive({ message: 'Intentos debe ser > 0.' })
  attempts!: number;

  @IsInt()
  @IsPositive({ message: 'Total de preguntas debe ser > 0.' })
  totalQuestions!: number;

  @IsInt()
  @Min(45, { message: 'Tiempo (minutos) mínimo: 45.' })
  @Max(240, { message: 'Tiempo (minutos) máximo: 240.' })
  timeMinutes!: number;

  @ValidateNested()
  @Type(() => DistributionDto)
  distribution!: DistributionDto;
}
