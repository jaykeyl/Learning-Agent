import {
  IsString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class AssociateDocumentToCourseDto {
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;
}

export class AssociateDocumentToCourseResponseDto {
  success: boolean;
  message: string;
  documentId: string;
  courseId: string;

  constructor(
    success: boolean,
    message: string,
    documentId: string,
    courseId: string,
  ) {
    this.success = success;
    this.message = message;
    this.documentId = documentId;
    this.courseId = courseId;
  }
}
