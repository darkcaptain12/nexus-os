import type { AIProviderName, AIModel, TokenUsage } from '../core/types';

export type RoutingStrategy = 'cost-optimized' | 'latency-optimized' | 'quality-optimized' | 'fallback' | 'round-robin';

export interface RouterConfig {
  defaultProvider: AIProviderName;
  strategy: RoutingStrategy;
  providers: ProviderRegistration[];
  fallbackChain: AIProviderName[];
  retryPolicy: RetryPolicy;
  tokenBudget?: TokenBudget;
}

export interface ProviderRegistration {
  provider: AIProviderName;
  enabled: boolean;
  priority: number;
  weight: number;
  rateLimit: RateLimit;
  models: AIModel[];
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RateLimit {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
}

export interface TokenBudget {
  dailyLimit: number;
  monthlyLimit: number;
  perRequestLimit: number;
  warningThreshold: number;
}

export interface RoutingDecision {
  provider: AIProviderName;
  model: string;
  reason: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  alternatives: RoutingAlternative[];
}

export interface RoutingAlternative {
  provider: AIProviderName;
  model: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  reason: string;
}

export interface ProviderUsage {
  provider: AIProviderName;
  requestsToday: number;
  tokensToday: number;
  costToday: number;
  lastRequestAt: string;
  usage: TokenUsage;
}
