export type MemoryType =
  | 'embedding'
  | 'knowledge'
  | 'context'
  | 'conversation'
  | 'document';

export interface EmbeddingVector {
  id: string;
  vector: number[];
  dimensions: number;
  model: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextWindow {
  id: string;
  entries: MemoryEntry[];
  tokenCount: number;
  maxTokens: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: EmbeddingVector;
  metadata: Record<string, unknown>;
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: EmbeddingVector;
  score?: number;
  createdAt: string;
  expiresAt?: string;
  metadata: Record<string, unknown>;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export interface MemoryStore {
  store(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry>;
  retrieve(id: string): Promise<MemoryEntry | null>;
  search(query: string, options?: { type?: MemoryType; limit?: number }): Promise<MemorySearchResult[]>;
  delete(id: string): Promise<void>;
  clear(type?: MemoryType): Promise<void>;
}
