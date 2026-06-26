import type {
  AIProviderName,
  AIMessage,
  AIResponse,
  AIStreamResponse,
  AIModel,
  ChatOptions,
} from './types';

export interface AIProvider {
  readonly name: AIProviderName;
  chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options?: ChatOptions): Promise<AIStreamResponse>;
  listModels(): Promise<AIModel[]>;
  healthCheck(): Promise<ProviderHealth>;
}

export interface ProviderHealth {
  provider: AIProviderName;
  available: boolean;
  latencyMs: number;
  lastChecked: string;
  error?: string;
}

export interface AISystem {
  router: AIRouter;
  agents: AgentOrchestrator;
  memory: MemoryEngine;
  tools: ToolRegistry;
  context: ContextEngine;
  telemetry: TelemetryCollector;
  safety: SafetyGuard;
}

export interface AIRouter {
  route(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options?: ChatOptions): Promise<AIStreamResponse>;
  selectProvider(requirements: RoutingRequirements): AIProviderName;
  getProviderHealth(): Promise<ProviderHealth[]>;
}

export interface RoutingRequirements {
  capabilities?: string[];
  maxCostPer1kTokens?: number;
  maxLatencyMs?: number;
  minContextWindow?: number;
  preferredProvider?: AIProviderName;
}

export interface AgentOrchestrator {
  execute(agentId: string, input: AgentInput): Promise<AgentResult>;
  executeParallel(requests: AgentExecutionRequest[]): Promise<AgentResult[]>;
  executeSequential(requests: AgentExecutionRequest[]): Promise<AgentResult[]>;
  cancel(executionId: string): Promise<void>;
}

export interface AgentInput {
  task: string;
  context?: Record<string, unknown>;
  constraints?: AgentConstraints;
}

export interface AgentConstraints {
  maxTokens?: number;
  maxCost?: number;
  maxDuration?: number;
  allowedTools?: string[];
  requireApproval?: boolean;
}

export interface AgentResult {
  executionId: string;
  agentId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  output: string;
  toolCalls: ToolExecutionResult[];
  reasoning?: string;
  usage: import('./types').TokenUsage;
  durationMs: number;
  timestamp: string;
}

export interface AgentExecutionRequest {
  agentId: string;
  input: AgentInput;
  priority?: number;
  dependsOn?: string[];
}

export interface ToolExecutionResult {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface MemoryEngine {
  store(content: string, metadata: MemoryMetadata): Promise<string>;
  recall(query: string, options?: RecallOptions): Promise<MemoryResult[]>;
  forget(memoryId: string): Promise<void>;
  summarize(memoryIds: string[]): Promise<string>;
}

export interface MemoryMetadata {
  type: string;
  source: string;
  importance: number;
  tags?: string[];
  ttl?: number;
  privacy?: 'public' | 'private' | 'system';
}

export interface RecallOptions {
  type?: string;
  limit?: number;
  minScore?: number;
  timeRange?: { from: string; to: string };
}

export interface MemoryResult {
  id: string;
  content: string;
  score: number;
  metadata: MemoryMetadata;
  timestamp: string;
}

export interface ContextEngine {
  build(input: ContextBuildRequest): Promise<ContextOutput>;
  optimize(context: ContextOutput, tokenBudget: number): Promise<ContextOutput>;
  estimateTokens(content: string): number;
}

export interface ContextBuildRequest {
  messages: AIMessage[];
  memories?: MemoryResult[];
  systemPrompt?: string;
  tools?: import('./types').AIToolDefinition[];
  maxTokens: number;
}

export interface ContextOutput {
  messages: AIMessage[];
  tokenCount: number;
  truncated: boolean;
  includedMemories: string[];
}

export interface ToolRegistry {
  register(tool: RegisteredTool): void;
  unregister(toolName: string): void;
  get(toolName: string): RegisteredTool | undefined;
  list(category?: string): RegisteredTool[];
  execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface RegisteredTool {
  name: string;
  category: string;
  description: string;
  parameters: Record<string, unknown>;
  permissions: string[];
  executionMode: 'sync' | 'async' | 'stream';
  timeout: number;
  owner: string;
  health: 'healthy' | 'degraded' | 'unavailable';
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export interface TelemetryCollector {
  recordExecution(record: ExecutionRecord): void;
  recordError(error: ErrorRecord): void;
  getMetrics(timeRange: { from: string; to: string }): Promise<AIMetrics>;
}

export interface ExecutionRecord {
  executionId: string;
  agentId?: string;
  provider: AIProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  timestamp: string;
}

export interface ErrorRecord {
  executionId: string;
  provider: AIProviderName;
  error: string;
  code: string;
  retryable: boolean;
  timestamp: string;
}

export interface AIMetrics {
  totalExecutions: number;
  totalTokens: number;
  totalCost: number;
  averageLatencyMs: number;
  successRate: number;
  errorRate: number;
  byProvider: Record<string, ProviderMetrics>;
}

export interface ProviderMetrics {
  executions: number;
  tokens: number;
  cost: number;
  averageLatencyMs: number;
  successRate: number;
}

export interface SafetyGuard {
  check(action: SafetyCheckRequest): Promise<SafetyCheckResult>;
  requireApproval(action: string, context: Record<string, unknown>): Promise<boolean>;
}

export interface SafetyCheckRequest {
  action: string;
  toolName?: string;
  parameters?: Record<string, unknown>;
  agentId?: string;
  userId?: string;
}

export interface SafetyCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  risks: SafetyRisk[];
  reason?: string;
}

export interface SafetyRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
}
