import type { ExecutionStatus } from '../core/types';

export type PlanStatus = 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';

export interface Goal {
  id: string;
  description: string;
  success_criteria: string[];
  priority: number;
  deadline?: string;
  constraints: string[];
  metadata: Record<string, unknown>;
}

export interface Plan {
  id: string;
  goalId: string;
  status: PlanStatus;
  tasks: PlanTask[];
  dependencies: TaskDependency[];
  estimatedDurationMs: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanTask {
  id: string;
  planId: string;
  title: string;
  description: string;
  agentId?: string;
  toolRequirements: string[];
  status: ExecutionStatus;
  priority: number;
  order: number;
  subtasks: PlanSubtask[];
  estimatedDurationMs: number;
  estimatedTokens: number;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PlanSubtask {
  id: string;
  taskId: string;
  description: string;
  status: ExecutionStatus;
  output?: string;
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string;
  type: 'blocks' | 'informs' | 'requires-approval';
}

export interface ExecutionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  taskId: string;
  status: ExecutionStatus;
  level: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: TaskDependency['type'];
}

export interface PlanProgress {
  planId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  progressPercent: number;
  estimatedRemainingMs: number;
}
