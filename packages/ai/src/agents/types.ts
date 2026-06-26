import type { ExecutionStatus } from '../core/types';

export type AgentType = 'single' | 'planner' | 'executor' | 'reviewer' | 'coordinator';

export type OrchestrationMode = 'single' | 'parallel' | 'sequential' | 'pipeline' | 'graph';

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  version: string;
  capabilities: string[];
  permissions: string[];
  priority: number;
  memoryAccess: MemoryAccessLevel;
  toolAccess: string[];
  costLimit: number;
  timeout: number;
  status: AgentStatus;
  health: AgentHealth;
  owner: string;
  systemPrompt: string;
  model?: string;
  provider?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export type AgentStatus = 'active' | 'inactive' | 'deprecated' | 'testing';

export type MemoryAccessLevel = 'none' | 'read' | 'read-write' | 'full';

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  lastExecutedAt?: string;
  successRate: number;
  averageLatencyMs: number;
  totalExecutions: number;
  consecutiveFailures: number;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: ExecutionStatus;
  input: string;
  output?: string;
  reasoning?: ReasoningTrace;
  toolCalls: ToolCallRecord[];
  memoryAccesses: MemoryAccessRecord[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokenUsage: { input: number; output: number; total: number; cost: number };
  error?: { code: string; message: string; retryable: boolean };
}

export interface ReasoningTrace {
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
}

export interface ReasoningStep {
  step: number;
  thought: string;
  action?: string;
  observation?: string;
  timestamp: string;
}

export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface MemoryAccessRecord {
  operation: 'read' | 'write' | 'search';
  memoryType: string;
  count: number;
  timestamp: string;
}

export interface OrchestrationPlan {
  id: string;
  mode: OrchestrationMode;
  agents: OrchestrationStep[];
  dependencies: AgentDependency[];
  timeout: number;
  maxCost: number;
}

export interface OrchestrationStep {
  agentId: string;
  input: string;
  priority: number;
  required: boolean;
  retries: number;
}

export interface AgentDependency {
  from: string;
  to: string;
  type: 'data' | 'approval' | 'sequence';
}

export interface OrchestrationResult {
  planId: string;
  status: ExecutionStatus;
  results: AgentExecution[];
  mergedOutput?: string;
  totalDurationMs: number;
  totalCost: number;
  totalTokens: number;
}
