import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDefined } from 'class-validator';

export class SaveApprovedExamDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDefined()
  content!: any;

  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @IsEnum(['Guardado', 'Publicado'] as any)
  status?: 'Guardado' | 'Publicado';
}