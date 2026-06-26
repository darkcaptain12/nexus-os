import type { BaseEvent } from './types';

interface UserEvent extends BaseEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  payload: { userId: string };
}

interface TradeEvent extends BaseEvent {
  type: 'trade.opened' | 'trade.closed' | 'trade.updated';
  payload: { tradeId: string; symbol: string };
}

interface OrderEvent extends BaseEvent {
  type: 'order.created' | 'order.fulfilled' | 'order.cancelled';
  payload: { orderId: string };
}

interface AgentStartedEvent extends BaseEvent {
  type: 'agent.started';
  payload: { agentId: string; executionId: string; input: string };
}

interface AgentFinishedEvent extends BaseEvent {
  type: 'agent.finished';
  payload: { agentId: string; executionId: string; output: string; durationMs: number; cost: number };
}

interface AgentFailedEvent extends BaseEvent {
  type: 'agent.failed';
  payload: { agentId: string; executionId: string; error: string; retryable: boolean };
}

interface MemoryCreatedEvent extends BaseEvent {
  type: 'memory.created';
  payload: { memoryId: string; type: string; source: string };
}

interface MemoryUpdatedEvent extends BaseEvent {
  type: 'memory.updated';
  payload: { memoryId: string; field: string };
}

interface MemoryDeletedEvent extends BaseEvent {
  type: 'memory.deleted';
  payload: { memoryId: string; reason: string };
}

interface ToolExecutedEvent extends BaseEvent {
  type: 'tool.executed';
  payload: { toolName: string; executionId: string; success: boolean; durationMs: number };
}

interface RouterSelectedEvent extends BaseEvent {
  type: 'router.selected';
  payload: { provider: string; model: string; reason: string; estimatedCost: number };
}

interface ReasoningCompletedEvent extends BaseEvent {
  type: 'reasoning.completed';
  payload: { chainId: string; method: string; confidence: number; steps: number };
}

interface PlanningCompletedEvent extends BaseEvent {
  type: 'planning.completed';
  payload: { planId: string; goalId: string; taskCount: number; estimatedDurationMs: number };
}

interface WorkflowStartedEvent extends BaseEvent {
  type: 'workflow.started';
  payload: { workflowId: string; triggerId: string };
}

interface WorkflowFinishedEvent extends BaseEvent {
  type: 'workflow.finished';
  payload: { workflowId: string; status: string; durationMs: number };
}

interface NotificationEvent extends BaseEvent {
  type: 'notification.sent' | 'notification.failed' | 'notification.read';
  payload: { notificationId: string; channel: string };
}

interface SafetyEvent extends BaseEvent {
  type: 'safety.blocked' | 'safety.approval-requested' | 'safety.approved' | 'safety.denied';
  payload: { action: string; agentId: string; riskLevel: string; reason: string };
}

export interface EventMap {
  user: UserEvent;
  trade: TradeEvent;
  order: OrderEvent;
  'agent.started': AgentStartedEvent;
  'agent.finished': AgentFinishedEvent;
  'agent.failed': AgentFailedEvent;
  'memory.created': MemoryCreatedEvent;
  'memory.updated': MemoryUpdatedEvent;
  'memory.deleted': MemoryDeletedEvent;
  'tool.executed': ToolExecutedEvent;
  'router.selected': RouterSelectedEvent;
  'reasoning.completed': ReasoningCompletedEvent;
  'planning.completed': PlanningCompletedEvent;
  'workflow.started': WorkflowStartedEvent;
  'workflow.finished': WorkflowFinishedEvent;
  notification: NotificationEvent;
  safety: SafetyEvent;
}
