import type { AIMessage } from '../core/types';
import type {
  ContextFrame,
  TokenBudgetAllocation,
  CompressionResult,
  CompressionStrategy,
  RelevanceScore,
  DuplicateDetectionResult,
} from './types';

export interface ContextBuilder {
  create(maxTokens: number): ContextBuildSession;
}

export interface ContextBuildSession {
  setSystemPrompt(prompt: string): ContextBuildSession;
  addMessages(messages: AIMessage[]): ContextBuildSession;
  addMemories(memories: { id: string; content: string; score: number }[]): ContextBuildSession;
  addTools(toolNames: string[]): ContextBuildSession;
  build(): Promise<ContextFrame>;
}

export interface ContextOptimizer {
  optimize(frame: ContextFrame, targetTokens: number): Promise<ContextFrame>;
  compress(content: string, strategy: CompressionStrategy, targetTokens: number): Promise<CompressionResult>;
  prioritize(items: { id: string; content: string; importance: number }[]): RelevanceScore[];
}

export interface TokenBudgetManager {
  allocate(totalBudget: number, config: BudgetConfig): TokenBudgetAllocation;
  rebalance(allocation: TokenBudgetAllocation, overflowSection: string): TokenBudgetAllocation;
}

export interface BudgetConfig {
  systemPromptRatio: number;
  memoryRatio: number;
  historyRatio: number;
  toolsRatio: number;
  responseReserveRatio: number;
}

export interface DuplicateDetector {
  detect(items: { id: string; content: string }[], threshold: number): Promise<DuplicateDetectionResult>;
}

export interface TokenCounter {
  count(content: string): number;
  countMessages(messages: AIMessage[]): number;
}
