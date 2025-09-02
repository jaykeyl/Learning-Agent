import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AiConfigService } from '../../core/ai/ai.config';
import { IdentityModule } from '../identity/identity.module';
import {
  FILE_STORAGE_REPO,
  DOCUMENT_REPOSITORY_PORT,
  TEXT_EXTRACTION_PORT,
  DOCUMENT_STORAGE_PORT,
  CHUNKING_STRATEGY_PORT,
  DOCUMENT_CHUNK_REPOSITORY_PORT,
  EMBEDDING_GENERATOR_PORT,
  VECTOR_SEARCH_PORT,
} from './tokens';

// Domain ports
import { EmbeddingGeneratorPort } from './domain/ports/embedding-generator.port';
import { VectorSearchPort } from './domain/ports/vector-search.port';
import { DocumentChunkRepositoryPort } from './domain/ports/document-chunk-repository.port';

// Controllers
import { DocumentsController } from './infrastructure/http/documents.controller';
import { EmbeddingsController } from './infrastructure/http/embeddings.controller';

// Infrastructure adapters
import { S3StorageAdapter } from './infrastructure/storage/S3-storage.adapter';
import { PrismaDocumentRepositoryAdapter } from './infrastructure/persistence/prisma-document-repository.adapter';
import { PdfTextExtractionAdapter } from './infrastructure/text-extraction/pdf-text-extraction.adapter';
import { SemanticTextChunkingAdapter } from './infrastructure/chunking/semantic-text-chunking.adapter';
import { PrismaDocumentChunkRepositoryAdapter } from './infrastructure/persistence/prisma-document-chunk-repository.adapter';
import { OpenAIEmbeddingAdapter } from './infrastructure/ai/openai-embedding.adapter';
import { PgVectorSearchAdapter } from './infrastructure/search/pgvector-search.adapter';

// Domain services
import { DocumentChunkingService } from './domain/services/document-chunking.service';
import { DocumentEmbeddingService } from './domain/services/document-embedding.service';

// Use cases
import { ListDocumentsUseCase } from './application/queries/list-documents.usecase';
import { DeleteDocumentUseCase } from './application/commands/delete-document.usecase';
import { UploadDocumentUseCase } from './application/commands/upload-document.usecase';
import { DownloadDocumentUseCase } from './application/commands/download-document.usecase';
import { ProcessDocumentTextUseCase } from './application/commands/process-document-text.usecase';
import { ProcessDocumentChunksUseCase } from './application/commands/process-document-chunks.usecase';
import { GenerateDocumentEmbeddingsUseCase } from './application/use-cases/generate-document-embeddings.use-case';
import { SearchDocumentsUseCase } from './application/use-cases/search-documents.use-case';
import { NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from './infrastructure/http/middleware/auth.middleware';
@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [DocumentsController, EmbeddingsController],
  providers: [
    // Servicios de configuración
    AiConfigService,

    // Infrastructure adapters
    { provide: DOCUMENT_STORAGE_PORT, useClass: S3StorageAdapter },
    {
      provide: DOCUMENT_REPOSITORY_PORT,
      useClass: PrismaDocumentRepositoryAdapter,
    },
    { provide: TEXT_EXTRACTION_PORT, useClass: PdfTextExtractionAdapter },
    { provide: CHUNKING_STRATEGY_PORT, useClass: SemanticTextChunkingAdapter },
    {
      provide: DOCUMENT_CHUNK_REPOSITORY_PORT,
      useClass: PrismaDocumentChunkRepositoryAdapter,
    },

    // Nuevos adapters para Phase 3
    {
      provide: EMBEDDING_GENERATOR_PORT,
      useFactory: (aiConfig: AiConfigService) => {
        return new OpenAIEmbeddingAdapter(aiConfig.getOpenAIConfig());
      },
      inject: [AiConfigService],
    },
    {
      provide: VECTOR_SEARCH_PORT,
      useFactory: (
        prisma: PrismaService,
        embeddingGenerator: EmbeddingGeneratorPort,
      ) => {
        return new PgVectorSearchAdapter(prisma, embeddingGenerator);
      },
      inject: [PrismaService, EMBEDDING_GENERATOR_PORT],
    },

    // Legacy token for backward compatibility
    { provide: FILE_STORAGE_REPO, useClass: S3StorageAdapter },

    // Domain services
    {
      provide: DocumentChunkingService,
      useFactory: (
        chunkingStrategy: SemanticTextChunkingAdapter,
        chunkRepository: PrismaDocumentChunkRepositoryAdapter,
      ) => {
        return new DocumentChunkingService(chunkingStrategy, chunkRepository);
      },
      inject: [CHUNKING_STRATEGY_PORT, DOCUMENT_CHUNK_REPOSITORY_PORT],
    },
    {
      provide: DocumentEmbeddingService,
      useFactory: (
        embeddingGenerator: EmbeddingGeneratorPort,
        vectorSearch: VectorSearchPort,
        chunkRepository: DocumentChunkRepositoryPort,
      ) => {
        return new DocumentEmbeddingService(
          embeddingGenerator,
          vectorSearch,
          chunkRepository,
        );
      },
      inject: [
        EMBEDDING_GENERATOR_PORT,
        VECTOR_SEARCH_PORT,
        DOCUMENT_CHUNK_REPOSITORY_PORT,
      ],
    },

    // Use cases
    {
      provide: ListDocumentsUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
      ) => {
        return new ListDocumentsUseCase(storageAdapter, documentRepository);
      },
      inject: [DOCUMENT_STORAGE_PORT, DOCUMENT_REPOSITORY_PORT],
    },
    {
      provide: DeleteDocumentUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
      ) => {
        return new DeleteDocumentUseCase(storageAdapter, documentRepository);
      },
      inject: [DOCUMENT_STORAGE_PORT, DOCUMENT_REPOSITORY_PORT],
    },
    {
      provide: UploadDocumentUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
      ) => {
        return new UploadDocumentUseCase(storageAdapter, documentRepository);
      },
      inject: [DOCUMENT_STORAGE_PORT, DOCUMENT_REPOSITORY_PORT],
    },
    {
      provide: DownloadDocumentUseCase,
      useFactory: (
        storageAdapter: S3StorageAdapter,
        documentRepository: PrismaDocumentRepositoryAdapter,
      ) => {
        return new DownloadDocumentUseCase(storageAdapter, documentRepository);
      },
      inject: [DOCUMENT_STORAGE_PORT, DOCUMENT_REPOSITORY_PORT],
    },
    {
      provide: ProcessDocumentTextUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        textExtraction: PdfTextExtractionAdapter,
        storageAdapter: S3StorageAdapter,
      ) => {
        return new ProcessDocumentTextUseCase(
          documentRepository,
          textExtraction,
          storageAdapter,
        );
      },
      inject: [
        DOCUMENT_REPOSITORY_PORT,
        TEXT_EXTRACTION_PORT,
        DOCUMENT_STORAGE_PORT,
      ],
    },
    {
      provide: ProcessDocumentChunksUseCase,
      useFactory: (
        documentRepository: PrismaDocumentRepositoryAdapter,
        chunkingService: DocumentChunkingService,
      ) => {
        return new ProcessDocumentChunksUseCase(
          documentRepository,
          chunkingService,
        );
      },
      inject: [DOCUMENT_REPOSITORY_PORT, DocumentChunkingService],
    },
    {
      provide: GenerateDocumentEmbeddingsUseCase,
      useFactory: (embeddingService: DocumentEmbeddingService) => {
        return new GenerateDocumentEmbeddingsUseCase(embeddingService);
      },
      inject: [DocumentEmbeddingService],
    },
    {
      provide: SearchDocumentsUseCase,
      useFactory: (embeddingService: DocumentEmbeddingService) => {
        return new SearchDocumentsUseCase(embeddingService);
      },
      inject: [DocumentEmbeddingService],
    },
  ],
  exports: [
    // Casos de uso originales
    ListDocumentsUseCase,
    DeleteDocumentUseCase,
    UploadDocumentUseCase,
    DownloadDocumentUseCase,
    ProcessDocumentTextUseCase,
    ProcessDocumentChunksUseCase,

    // Nuevos casos de uso para embeddings
    GenerateDocumentEmbeddingsUseCase,
    SearchDocumentsUseCase,

    // Servicios de dominio
    DocumentChunkingService,
    DocumentEmbeddingService,

    // Tokens de puertos (para testing o extensión)
    DOCUMENT_REPOSITORY_PORT,
    TEXT_EXTRACTION_PORT,
    DOCUMENT_STORAGE_PORT,
    CHUNKING_STRATEGY_PORT,
    DOCUMENT_CHUNK_REPOSITORY_PORT,
    EMBEDDING_GENERATOR_PORT,
    VECTOR_SEARCH_PORT,
  ],
})
export class DocumentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'api/documents/upload', method: RequestMethod.POST });
  }
}