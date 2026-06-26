export interface EmbeddingModel {
  id: string;
  provider: string;
  dimensions: number;
  maxInputTokens: number;
  costPer1kTokens: number;
}

export interface EmbeddingRequest {
  content: string;
  model?: string;
  dimensions?: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingResult {
  id: string;
  vector: number[];
  dimensions: number;
  model: string;
  content: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SimilaritySearchRequest {
  query: string;
  limit: number;
  threshold: number;
  filter?: EmbeddingFilter;
}

export interface EmbeddingFilter {
  metadata?: Record<string, unknown>;
  createdAfter?: string;
  createdBefore?: string;
  tags?: string[];
}

export interface SimilarityResult {
  embeddingId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddingBatchResult {
  successful: EmbeddingResult[];
  failed: { content: string; error: string }[];
  totalTokens: number;
  cost: number;
}
