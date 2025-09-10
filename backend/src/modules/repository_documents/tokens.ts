export const DOCUMENT_REPO = Symbol('DocumentRepositoryPort');
export const FILE_STORAGE_REPO = Symbol('FileStorageRepositoryPort');

// Nuevos tokens para la funcionalidad RAG
export const DOCUMENT_REPOSITORY_PORT = Symbol('DocumentRepositoryPort');
export const TEXT_EXTRACTION_PORT = Symbol('TextExtractionPort');
export const DOCUMENT_STORAGE_PORT = Symbol('DocumentStoragePort');
export const CHUNKING_STRATEGY_PORT = Symbol('ChunkingStrategyPort');
export const DOCUMENT_CHUNK_REPOSITORY_PORT = Symbol(
  'DocumentChunkRepositoryPort',
);

// Tokens para Phase 3 - Embeddings y búsqueda vectorial
export const EMBEDDING_GENERATOR_PORT = Symbol('EmbeddingGeneratorPort');
export const VECTOR_SEARCH_PORT = Symbol('VectorSearchPort');

// Token para documentos eliminados
export const DELETED_DOCUMENT_REPOSITORY_PORT = Symbol(
  'DeletedDocumentRepositoryPort',
);
