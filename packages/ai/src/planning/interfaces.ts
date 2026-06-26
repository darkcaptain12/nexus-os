import type { Goal, Plan, PlanTask, ExecutionGraph, PlanProgress } from './types';

export interface PlanningEngine {
  createPlan(goal: Goal): Promise<Plan>;
  decompose(taskId: string): Promise<PlanTask[]>;
  replan(planId: string, feedback: string): Promise<Plan>;
  getExecutionGraph(planId: string): ExecutionGraph;
  getProgress(planId: string): PlanProgress;
}

export interface TaskDecomposer {
  decompose(description: string, constraints: string[]): Promise<PlanTask[]>;
  estimateDuration(task: PlanTask): number;
  estimateTokens(task: PlanTask): number;
  identifyDependencies(tasks: PlanTask[]): import('./types').TaskDependency[];
}

export interface PlanOptimizer {
  optimize(plan: Plan): Promise<Plan>;
  parallelize(plan: Plan): Plan;
  reorder(plan: Plan, priorityFn: (task: PlanTask) => number): Plan;
  estimateCost(plan: Plan): number;
}

export interface ProgressTracker {
  start(planId: string): void;
  updateTask(taskId: string, status: import('../core/types').ExecutionStatus, output?: string): void;
  complete(planId: string): void;
  fail(planId: string, error: string): void;
  getProgress(planId: string): PlanProgress;
}
