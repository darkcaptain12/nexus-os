import type {
  AgentDefinition,
  AgentExecution,
  OrchestrationPlan,
  OrchestrationResult,
} from './types';

export interface AgentOrchestratorService {
  execute(agentId: string, input: string, context?: ExecutionContext): Promise<AgentExecution>;
  orchestrate(plan: OrchestrationPlan): Promise<OrchestrationResult>;
  cancel(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<AgentExecution | null>;
  listExecutions(agentId?: string): Promise<AgentExecution[]>;
}

export interface ExecutionContext {
  userId?: string;
  sessionId?: string;
  conversationId?: string;
  parentExecutionId?: string;
  variables?: Record<string, unknown>;
  constraints?: ExecutionConstraints;
}

export interface ExecutionConstraints {
  maxTokens?: number;
  maxCost?: number;
  maxDurationMs?: number;
  allowedTools?: string[];
  forbiddenTools?: string[];
  requireApproval?: boolean;
  memoryAccess?: 'none' | 'read' | 'read-write';
}

export interface PlannerAgent {
  plan(goal: string, context: ExecutionContext): Promise<OrchestrationPlan>;
  replan(planId: string, feedback: string): Promise<OrchestrationPlan>;
}

export interface ReviewerAgent {
  review(execution: AgentExecution): Promise<ReviewResult>;
}

export interface ReviewResult {
  approved: boolean;
  score: number;
  feedback: string;
  suggestions: string[];
  risks: string[];
}

export interface CoordinatorAgent {
  coordinate(agents: AgentDefinition[], goal: string): Promise<OrchestrationPlan>;
  mergeResults(results: AgentExecution[]): Promise<string>;
  resolveConflicts(results: AgentExecution[]): Promise<string>;
}

export interface ResultMerger {
  merge(results: AgentExecution[], strategy: MergeStrategy): Promise<string>;
}

export type MergeStrategy = 'concatenate' | 'summarize' | 'best-of' | 'consensus' | 'custom';
