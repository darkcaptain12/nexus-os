import type { AIMessage } from '../core/types';

export interface ContextFrame {
  id: string;
  messages: AIMessage[];
  memories: ContextMemoryRef[];
  systemPrompt: string;
  tools: string[];
  tokenCount: number;
  maxTokens: number;
  createdAt: string;
}

export interface ContextMemoryRef {
  memoryId: string;
  content: string;
  relevanceScore: number;
  tokenCount: number;
  source: string;
}

export interface TokenBudgetAllocation {
  systemPrompt: number;
  memories: number;
  conversationHistory: number;
  tools: number;
  responseReserve: number;
  total: number;
}

export interface CompressionResult {
  original: string;
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: CompressionStrategy;
}

export type CompressionStrategy = 'truncate' | 'summarize' | 'extract-key-points' | 'sliding-window';

export interface RelevanceScore {
  contentId: string;
  score: number;
  reason: string;
  recency: number;
  importance: number;
  similarity: number;
}

export interface DuplicateDetectionResult {
  duplicates: DuplicatePair[];
  uniqueCount: number;
  totalCount: number;
}

export interface DuplicatePair {
  idA: string;
  idB: string;
  similarity: number;
  recommendation: 'keep-a' | 'keep-b' | 'merge';
}
