import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDefined } from 'class-validator';

export class SaveSavedExamDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  examId!: string;

  @IsOptional()
  @IsEnum(['Guardado', 'Publicado'] as any)
  status?: 'Guardado' | 'Publicado';
}