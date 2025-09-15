import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateExamQuestionDto {
  @IsOptional() @IsIn(['MULTIPLE_CHOICE','TRUE_FALSE','OPEN_ANALYSIS','OPEN_EXERCISE'])
  kind!: 'MULTIPLE_CHOICE'|'TRUE_FALSE'|'OPEN_ANALYSIS'|'OPEN_EXERCISE';

  // PATCH: todo opcional
  @IsOptional() @IsString() @MaxLength(4000)
  text?: string;

  // MCQ
  @IsOptional() @IsArray()
  options?: string[];

  @IsOptional() @IsInt() @Min(0)
  correctOptionIndex?: number;

  // TRUE_FALSE
  @IsOptional() @IsBoolean()
  correctBoolean?: boolean;

  // OPEN_*
  @IsOptional() @IsString()
  expectedAnswer?: string;

  @IsOptional()
    @ValidateIf(o => o.kind === 'MULTIPLE_CHOICE')
    @IsInt()
    @Min(0)
    @ValidateIf(o => o.kind === 'TRUE_FALSE')
    @IsBoolean({ message: 'correctAnswer debe ser boolean.' })
    @ValidateIf(o => o.kind === 'OPEN_ANALYSIS' || o.kind === 'OPEN_EXERCISE')
    @IsIn([null], { message: 'correctAnswer debe ser null para preguntas abiertas.' })
    correctAnswer?: number | boolean | null;
}
