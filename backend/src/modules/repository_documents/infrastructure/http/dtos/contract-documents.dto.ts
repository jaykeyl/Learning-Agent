import {
  IsString,
  IsNumber,
  IsUrl,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ContractDocumentItemDto {
  @IsString()
  id: string;

  @IsString()
  titulo: string;

  @IsString()
  tipo: string;

  @IsUrl()
  url: string;

  @IsDateString()
  fechaCarga: string;

  @IsString()
  profesorId: string;

  constructor(
    id: string,
    titulo: string,
    tipo: string,
    url: string,
    fechaCarga: Date,
    profesorId: string,
  ) {
    this.id = id;
    this.titulo = titulo;
    this.tipo = tipo;
    this.url = url;
    this.fechaCarga = fechaCarga.toISOString();
    this.profesorId = profesorId;
  }
}

export class ContractDocumentListResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractDocumentItemDto)
  documentos: ContractDocumentItemDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  pagina: number;

  constructor(
    documentos: ContractDocumentItemDto[],
    total: number,
    pagina: number,
  ) {
    this.documentos = documentos;
    this.total = total;
    this.pagina = pagina;
  }
}

export class DocumentContentMetadataDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  paginas?: number;

  @IsOptional()
  @IsString()
  resumen?: string;

  constructor(paginas?: number, resumen?: string) {
    this.paginas = paginas;
    this.resumen = resumen;
  }
}

export class DocumentContentResponseDto {
  @IsString()
  contenido: string;

  @ValidateNested()
  @Type(() => DocumentContentMetadataDto)
  metadata: DocumentContentMetadataDto;

  constructor(contenido: string, metadata: DocumentContentMetadataDto) {
    this.contenido = contenido;
    this.metadata = metadata;
  }
}

// Query parameters DTOs
export class GetDocumentsBySubjectQueryDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
