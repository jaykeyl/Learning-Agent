/**
 * Generated data during similarity check that can be reused
 */
export interface GeneratedSimilarityData {
  chunks: any[];
  embeddings: number[][];
  extractedText: string;
  chunkingConfig?: any;
}

/**
 * Result of checking document similarity
 */
export class DocumentSimilarityResult {
  constructor(
    public readonly status:
      | 'exact_match'
      | 'text_hash_match'
      | 'text_match'
      | 'candidates'
      | 'no_match',
    public readonly existingDocument?: DocumentMatch,
    public readonly similarCandidates?: SimilarDocumentCandidate[],
    public readonly message?: string,
    public readonly generatedData?: GeneratedSimilarityData,
  ) {}
}

/**
 * Document that matches exactly or by text
 */
export class DocumentMatch {
  constructor(
    public readonly id: string,
    public readonly originalName: string,
    public readonly uploadedAt: Date,
    public readonly uploadedBy: string,
    public readonly matchType: 'binary_hash' | 'text_hash',
    public readonly documentTitle?: string,
    public readonly documentAuthor?: string,
  ) {}
}

/**
 * Similar document candidate found by embeddings
 */
export class SimilarDocumentCandidate {
  constructor(
    public readonly id: string,
    public readonly originalName: string,
    public readonly uploadedAt: Date,
    public readonly uploadedBy: string,
    public readonly similarityScore: number,
    public readonly avgSimilarity: number,
    public readonly coverage: number,
    public readonly matchedChunks: number,
    public readonly totalChunks: number,
    public readonly documentTitle?: string,
    public readonly documentAuthor?: string,
  ) {}
}

/**
 * Request to check document similarity
 */
export class CheckDocumentSimilarityRequest {
  constructor(
    public readonly file: Buffer,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly uploadedBy: string,
    public readonly options?: {
      /** Only check exact/text hash, skip embeddings */
      skipEmbeddings?: boolean;
      /** Minimum similarity threshold for candidates */
      similarityThreshold?: number;
      /** Maximum number of candidates to return */
      maxCandidates?: number;
      /** Use sampling for faster check */
      useSampling?: boolean;
      /** Return generated chunks and embeddings for reuse */
      returnGeneratedData?: boolean;
    },
  ) {}
}

/**
 * Internal scoring result for aggregating chunk matches by document
 */
export interface DocumentScore {
  documentId: string;
  similarities: number[];
  matchedChunks: number;
  totalChunks: number;
  avgSimilarity: number;
  coverage: number;
  finalScore: number;
}
