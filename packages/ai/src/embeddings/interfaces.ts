import type {
  EmbeddingModel,
  EmbeddingRequest,
  EmbeddingResult,
  SimilaritySearchRequest,
  SimilarityResult,
  EmbeddingBatchResult,
} from './types';

export interface EmbeddingService {
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
  embedBatch(requests: EmbeddingRequest[]): Promise<EmbeddingBatchResult>;
  search(request: SimilaritySearchRequest): Promise<SimilarityResult[]>;
  delete(embeddingId: string): Promise<void>;
  listModels(): EmbeddingModel[];
}

export interface VectorStore {
  upsert(id: string, vector: number[], metadata: Record<string, unknown>): Promise<void>;
  query(vector: number[], limit: number, threshold: number, filter?: Record<string, unknown>): Promise<SimilarityResult[]>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
