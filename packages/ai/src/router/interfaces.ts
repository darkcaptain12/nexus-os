import type { AIMessage, ChatOptions, AIResponse, AIStreamResponse, AIProviderName } from '../core/types';
import type { ProviderHealth } from '../core/interfaces';
import type { RouterConfig, RoutingDecision, ProviderUsage } from './types';

export interface AIRouterService {
  route(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options?: ChatOptions): Promise<AIStreamResponse>;
  selectProvider(options?: ChatOptions): RoutingDecision;
  getHealth(): Promise<ProviderHealth[]>;
  getUsage(): Promise<ProviderUsage[]>;
  updateConfig(config: Partial<RouterConfig>): void;
}

export interface CostEstimator {
  estimateRequest(provider: AIProviderName, model: string, inputTokens: number, maxOutputTokens: number): number;
  getDailyCost(): number;
  getMonthlyCost(): number;
  isWithinBudget(estimatedCost: number): boolean;
}

export interface LatencyEstimator {
  estimateLatency(provider: AIProviderName, model: string, inputTokens: number): number;
  getAverageLatency(provider: AIProviderName): number;
  recordLatency(provider: AIProviderName, model: string, latencyMs: number): void;
}

export interface ContextWindowSelector {
  selectModel(provider: AIProviderName, requiredTokens: number): string | undefined;
  getAvailableContext(provider: AIProviderName, model: string): number;
}
