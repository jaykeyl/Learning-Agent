import {
  IsString,
  IsNumber,
  IsUrl,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentListItemDto {
  @IsString()
  id: string;

  @IsString()
  fileName: string;

  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  size: number;

  @IsUrl()
  downloadUrl: string;

  @IsDateString()
  uploadedAt: Date;

  constructor(
    id: string,
    fileName: string,
    originalName: string,
    mimeType: string,
    size: number,
    downloadUrl: string,
    uploadedAt: Date,
  ) {
    this.id = id;
    this.fileName = fileName;
    this.originalName = originalName;
    this.mimeType = mimeType;
    this.size = size;
    this.downloadUrl = downloadUrl;
    this.uploadedAt = uploadedAt;
  }
}

export class DocumentListResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentListItemDto)
  documents: DocumentListItemDto[];

  @IsNumber()
  total: number;

  @IsString()
  message: string;

  constructor(
    documents: DocumentListItemDto[],
    total: number,
    message: string,
  ) {
    this.documents = documents;
    this.total = total;
    this.message = message;
  }
}

export class ErrorResponseDto {
  @IsNumber()
  statusCode: number;

  @IsString()
  message: string;

  @IsString()
  error: string;

  @IsString()
  details: string;

  constructor(
    statusCode: number,
    message: string,
    error: string,
    details: string,
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.error = error;
    this.details = details;
  }
}