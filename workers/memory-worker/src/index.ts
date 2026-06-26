export interface MemoryWorkerConfig {
  embeddingModel: string;
  embeddingDimensions: number;
  batchSize: number;
  indexingInterval: number;
}

export interface MemoryJob {
  id: string;
  type: 'embed' | 'index' | 'cleanup' | 'consolidate';
  content?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
