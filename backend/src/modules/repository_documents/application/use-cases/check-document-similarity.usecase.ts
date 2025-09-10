import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { DocumentRepositoryPort } from '../../domain/ports/document-repository.port';
import type { TextExtractionPort } from '../../domain/ports/text-extraction.port';
import type { ChunkingStrategyPort } from '../../domain/ports/chunking-strategy.port';
import type { EmbeddingGeneratorPort } from '../../domain/ports/embedding-generator.port';
import type { VectorSearchPort } from '../../domain/ports/vector-search.port';
import type { DocumentChunkRepositoryPort } from '../../domain/ports/document-chunk-repository.port';
import { DocumentStatus } from '../../domain/entities/document.entity';
import {
  CheckDocumentSimilarityRequest,
  DocumentSimilarityResult,
  DocumentMatch,
  SimilarDocumentCandidate,
  DocumentScore,
  GeneratedSimilarityData,
} from '../../domain/value-objects/document-similarity-check.vo';

@Injectable()
export class CheckDocumentSimilarityUseCase {
  private readonly logger = new Logger(CheckDocumentSimilarityUseCase.name);

  constructor(
    private readonly documentRepository: DocumentRepositoryPort,
    private readonly textExtraction: TextExtractionPort,
    private readonly chunkingStrategy: ChunkingStrategyPort,
    private readonly embeddingGenerator: EmbeddingGeneratorPort,
    private readonly vectorSearch: VectorSearchPort,
    private readonly chunkRepository: DocumentChunkRepositoryPort,
  ) {}

  async execute(
    request: CheckDocumentSimilarityRequest,
  ): Promise<DocumentSimilarityResult> {
    try {
      this.logger.log(`Starting similarity check for: ${request.originalName}`);

      // paso 1: verificar hash binario exacto (sha-256)
      const fileHash = this.generateFileHash(request.file);
      const exactMatch = await this.documentRepository.findByFileHash(fileHash);

      if (exactMatch) {
        this.logger.log(
          `Found exact binary match: ${exactMatch.id}, Status: ${exactMatch.status}, Name: ${exactMatch.originalName}`,
        );

        // Verificar que el documento está ACTIVO (no DELETED)
        if (exactMatch.status === DocumentStatus.DELETED) {
          this.logger.warn(
            `Documento encontrado está DELETED, debería haber sido excluido por findByFileHash`,
          );
          // No considerar como match si está eliminado
          // Continuar con verificación de texto hash
        } else {
          this.logger.log(
            `Documento ACTIVO encontrado, considerando como duplicado`,
          );
          return new DocumentSimilarityResult(
            'exact_match',
            new DocumentMatch(
              exactMatch.id,
              exactMatch.originalName,
              exactMatch.uploadedAt,
              exactMatch.uploadedBy,
              'binary_hash',
              exactMatch.documentTitle,
              exactMatch.documentAuthor,
            ),
          );
        }
      }

      // paso 2: extraer texto y verificar hash de texto
      const extractedText = await this.textExtraction.extractTextFromPdf(
        request.file,
        request.originalName,
      );

      const textHash = this.generateTextHash(extractedText.content);

      // verificar coincidencia por hash de texto (mismo contenido, posible otra edición)
      const textHashMatch =
        await this.documentRepository.findByTextHash(textHash);
      if (textHashMatch) {
        this.logger.log(
          `Text hash match found for document: ${textHashMatch.id}`,
        );
        return new DocumentSimilarityResult(
          'text_hash_match',
          new DocumentMatch(
            textHashMatch.id,
            textHashMatch.originalName,
            textHashMatch.uploadedAt,
            textHashMatch.uploadedBy,
            'text_hash',
            textHashMatch.documentTitle,
            textHashMatch.documentAuthor,
          ),
        );
      }

      // paso 3: omitir embeddings si se solicita
      if (request.options?.skipEmbeddings) {
        return new DocumentSimilarityResult('no_match');
      }

      // paso 4: generar chunks y embeddings para la verificación de similitud
      const { similarCandidates, generatedData } =
        await this.findSimilarDocuments(
          extractedText.content,
          request.options?.similarityThreshold ?? 0.7,
          request.options?.maxCandidates ?? 10,
          request.options?.useSampling ?? true,
          request.options?.returnGeneratedData ?? false,
        );

      if (similarCandidates.length > 0) {
        this.logger.log(`Found ${similarCandidates.length} similar candidates`);
        return new DocumentSimilarityResult(
          'candidates',
          undefined,
          similarCandidates,
          `Found ${similarCandidates.length} similar documents`,
          generatedData,
        );
      }

      this.logger.log('No similar documents found');
      return new DocumentSimilarityResult(
        'no_match',
        undefined,
        undefined,
        undefined,
        generatedData,
      );
    } catch (error) {
      this.logger.error(
        `Error checking document similarity: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // genera hash sha-256 del contenido del archivo
  private generateFileHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  // genera hash del texto normalizado
  private generateTextHash(text: string): string {
    // normalizar texto: minúsculas, quitar espacios extra y normalizar saltos de línea
    const normalizedText = text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim();

    return createHash('sha256').update(normalizedText, 'utf8').digest('hex');
  }

  // buscar documentos similares usando embeddings y búsqueda vectorial
  private async findSimilarDocuments(
    text: string,
    threshold: number,
    maxCandidates: number,
    useSampling: boolean,
    returnGeneratedData: boolean = false,
  ): Promise<{
    similarCandidates: SimilarDocumentCandidate[];
    generatedData?: GeneratedSimilarityData;
  }> {
    try {
      // paso 1: generar chunks - se usa un id temporal
      const tempDocumentId = 'temp-similarity-check';
      const defaultConfig = this.chunkingStrategy.getDefaultConfig();

      const chunkingResult = await this.chunkingStrategy.chunkText(
        tempDocumentId,
        text,
        {
          ...defaultConfig,
          maxChunkSize: 1000,
          overlap: 200,
        },
      );

      // paso 2: procesar todos los chunks (100%) para verificación totalmente precisa
      // Usar 100% de los chunks en lugar de muestreo para máxima precisión
      const samplingPercentage = 1.0; // 100% de los chunks
      const maxSampleCount = chunkingResult.chunks.length; // Todos los chunks

      const chunksToProcess = chunkingResult.chunks; // Usar TODOS los chunks

      this.logger.log(
        `Processing ${chunksToProcess.length} of ${chunkingResult.chunks.length} chunks (100% - all chunks for maximum precision)`,
      );

      // paso 3: generar embeddings para los chunks
      const chunkContents = chunksToProcess.map(
        (chunk: any) => chunk.content as string,
      );
      const embeddingResult =
        await this.embeddingGenerator.generateBatchEmbeddings(chunkContents);

      // paso 4: buscar chunks similares
      const documentScores = new Map<string, DocumentScore>();

      // DEBUG: Verificar si hay documentos activos en la base de datos
      const activeDocuments = await this.documentRepository.findAll();
      this.logger.log(
        `DEBUG: Documentos activos en base de datos: ${activeDocuments.length}`,
      );

      if (activeDocuments.length === 0) {
        this.logger.warn(
          `No hay documentos activos en la base de datos para comparar. La DB parece estar vacía.`,
        );
        // Continuar pero ya sabemos que no habrá resultados
      } else {
        // DEBUG: Verificar chunks para cada documento
        for (const doc of activeDocuments.slice(0, 3)) {
          // Solo los primeros 3 para no spam logs
          const chunkCount = await this.chunkRepository.countByDocumentId(
            doc.id,
          );
          this.logger.log(
            `DEBUG: Documento ${doc.id} (${doc.originalName}): ${chunkCount} chunks`,
          );
        }
      }

      for (let i = 0; i < embeddingResult.embeddings.length; i++) {
        const embedding = embeddingResult.embeddings[i];

        // DEBUG: Log detallado para los primeros chunks
        if (i < 3) {
          this.logger.log(
            `🔍 DEBUG: Buscando chunk ${i + 1}/${embeddingResult.embeddings.length} - Embedding dimensiones: ${embedding.length}`,
          );
        }

        const searchResults = await this.vectorSearch.searchByVector(
          embedding,
          {
            limit: 5, // 5 mejores coincidencias por chunk
            similarityThreshold: Math.max(0.3, threshold - 0.2), // más permisivo para chunks individuales
          },
        );

        // DEBUG: Log resultados de la búsqueda
        if (i < 3 || searchResults.chunks.length > 0) {
          this.logger.log(
            `🔍 DEBUG: Chunk ${i + 1} encontró ${searchResults.chunks.length} resultados similares`,
          );
          if (searchResults.chunks.length > 0) {
            searchResults.chunks.forEach((result, idx) => {
              this.logger.log(
                `  - Resultado ${idx + 1}: Doc ${result.documentId}, similarity: ${result.similarityScore.toFixed(3)}`,
              );
            });
          }
        }

        // agregar resultados por documento
        for (const result of searchResults.chunks) {
          const docId = result.documentId;
          if (!documentScores.has(docId)) {
            // Obtener el número real de chunks del documento desde la BD
            const documentChunkCount =
              await this.chunkRepository.countByDocumentId(docId);

            documentScores.set(docId, {
              documentId: docId,
              similarities: [],
              matchedChunks: 0,
              totalChunks: documentChunkCount,
              avgSimilarity: 0,
              coverage: 0,
              finalScore: 0,
            });
          }

          const docScore = documentScores.get(docId)!;
          docScore.similarities.push(result.similarityScore);
          docScore.matchedChunks++;
        }
      }

      // paso 5: calcular puntuaciones finales y filtrar candidatos
      const candidatesList: SimilarDocumentCandidate[] = [];

      this.logger.log(
        `Documentos encontrados en búsqueda vectorial: ${documentScores.size}`,
      );

      for (const [docId, score] of documentScores) {
        // calcular métricas
        score.avgSimilarity =
          score.similarities.reduce((a, b) => a + b, 0) /
          score.similarities.length;
        score.coverage = score.matchedChunks / Math.max(score.totalChunks, 1); // Evitar división por 0

        // Limitar coverage a máximo 1.0 (100%)
        score.coverage = Math.min(score.coverage, 1.0);

        // Normalizar avgSimilarity a rango [0,1]
        score.avgSimilarity = Math.min(Math.max(score.avgSimilarity, 0), 1.0);

        score.finalScore = score.avgSimilarity * score.coverage;

        // Asegurar que finalScore esté en rango [0,1]
        score.finalScore = Math.min(Math.max(score.finalScore, 0), 1.0);

        this.logger.log(
          `Documento ${docId}: chunks=${score.matchedChunks}/${score.totalChunks}, avgSim=${score.avgSimilarity.toFixed(3)}, coverage=${score.coverage.toFixed(3)}, finalScore=${score.finalScore.toFixed(3)}, threshold=${threshold}`,
        );

        // filtrar por umbral
        if (score.finalScore >= threshold) {
          this.logger.log(
            `Documento ${docId} supera el umbral, agregando como candidato`,
          );

          const document = await this.documentRepository.findById(docId);
          if (document) {
            candidatesList.push(
              new SimilarDocumentCandidate(
                document.id,
                document.originalName,
                document.uploadedAt,
                document.uploadedBy,
                score.finalScore,
                score.avgSimilarity,
                score.coverage,
                score.matchedChunks,
                score.totalChunks,
                document.documentTitle,
                document.documentAuthor,
              ),
            );
          }
        } else {
          this.logger.log(
            `Documento ${docId} NO supera el umbral (${score.finalScore.toFixed(3)} < ${threshold})`,
          );
        }
      }

      this.logger.log(
        `Candidatos finales encontrados: ${candidatesList.length}`,
      );

      // ordenar por puntuación (mayor primero) y limitar resultados
      const finalCandidates = candidatesList
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, maxCandidates);

      // Preparar datos generados para reutilización si se solicita
      const generatedData: GeneratedSimilarityData | undefined =
        returnGeneratedData
          ? {
              chunks: chunksToProcess,
              embeddings: embeddingResult.embeddings,
              extractedText: text,
              chunkingConfig: {
                maxChunkSize: 1000,
                overlap: 200,
              },
            }
          : undefined;

      return {
        similarCandidates: finalCandidates,
        generatedData,
      };
    } catch (error) {
      this.logger.error(
        `Error finding similar documents: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // muestrea chunks para procesamiento más rápido
  // toma chunks del inicio, medio y final del documento
  private sampleChunks(chunks: any[], maxSamples: number): any[] {
    if (chunks.length <= maxSamples) {
      return chunks;
    }

    const sampled: any[] = [];
    const step = chunks.length / maxSamples;

    // tomar muestras distribuidas a lo largo del documento
    for (let i = 0; i < maxSamples; i++) {
      const index = Math.floor(i * step);
      sampled.push(chunks[index]);
    }

    return sampled;
  }
}
