import { useState, useEffect } from 'react';
import axios from 'axios';

interface Metadata {
  title?: string;
  author?: string;
  pages?: number;
  fileName?: string;
  fileType?: string;
  uploadDate?: string;
  mimeType?: string;
  size?: number;
  language?: string;
}

interface Statistics {
  wordCount: number;
  charCount: number;
  chunkCount: number;
}

interface Chunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: {
    pageNumber?: number;
    section?: string;
  };
}

interface ExtractedDataResponse {
  extractedData: string;
  metadata: Metadata;
  statistics: Statistics;
  chunks: Chunk[];
  loading: boolean;
  error: string | null;
  generateEmbeddings: () => Promise<void>;
}

const useExtractedData = (documentId: string): ExtractedDataResponse => {
  const [extractedData, setExtractedData] = useState<string>('');
  const [metadata, setMetadata] = useState<Metadata>({});
  const [statistics, setStatistics] = useState<Statistics>({ 
    wordCount: 0, 
    charCount: 0, 
    chunkCount: 0 
  });
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const generateEmbeddings = async () => {
    try {
      setLoading(true);
      await axios.post(`http://localhost:3000/api/repository-documents/embeddings/generate/${documentId}`);
      // Actualizar los chunks después de generar embeddings
      const chunksResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}/process-chunks`);
      setChunks(chunksResponse.data.chunks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar embeddings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener el texto procesado
        const textResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}/process-text`);
        const extractedText = textResponse.data.text || '';
        setExtractedData(extractedText);
        
        // Obtener chunks procesados
        const chunksResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}/process-chunks`);
        const processedChunks = chunksResponse.data.chunks || [];
        setChunks(processedChunks);
        
        // Calcular estadísticas
        const wordCount = extractedText.trim().split(/\s+/).length;
        const charCount = extractedText.length;
        const chunkCount = processedChunks.length;
        setStatistics({ 
          wordCount, 
          charCount, 
          chunkCount 
        });
        
        // Obtener metadatos del documento
        const metadataResponse = await axios.get(`http://localhost:3000/api/documents/${documentId}`);
        setMetadata({
          ...metadataResponse.data.metadata,
          uploadDate: new Date(metadataResponse.data.metadata.uploadDate).toLocaleDateString()
        });

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  return {
    extractedData,
    metadata,
    statistics,
    chunks,
    loading,
    error,
    generateEmbeddings
  };
};

export default useExtractedData;