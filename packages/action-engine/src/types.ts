export type ActionCategory =
  | 'http'
  | 'script'
  | 'desktop'
  | 'browser'
  | 'mcp'
  | 'github'
  | 'file'
  | 'email'
  | 'notification'
  | 'calendar'
  | 'webhook';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ExecutionStatus = 'queued' | 'pending-approval' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolled-back';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  riskLevel: RiskLevel;
  permissions: string[];
  timeout: number;
  rollbackCapable: boolean;
  parameters: ActionParameter[];
  metadata: Record<string, unknown>;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

export interface ActionRequest {
  actionId: string;
  params: Record<string, unknown>;
  requestedBy: string;
  source: 'user' | 'ai' | 'automation' | 'scheduler';
  priority: number;
  correlationId?: string;
}

export interface ActionExecution {
  id: string;
  actionId: string;
  actionName: string;
  category: ActionCategory;
  riskLevel: RiskLevel;
  status: ExecutionStatus;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  requestedBy: string;
  source: ActionRequest['source'];
  approvalId?: string;
  rollbackId?: string;
  priority: number;
  attempt: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  executionId: string;
  actionId: string;
  actionName: string;
  riskLevel: RiskLevel;
  description: string;
  params: Record<string, unknown>;
  requestedBy: string;
  status: ApprovalStatus;
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  expiresAt: string;
  createdAt: string;
}

export interface RollbackRecord {
  id: string;
  executionId: string;
  status: 'pending' | 'completed' | 'failed' | 'impossible';
  description: string;
  error?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExecutionQueueStats {
  queued: number;
  running: number;
  pendingApproval: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface ActionHandler {
  execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown>;
  rollback?(params: Record<string, unknown>, result: unknown, context: ExecutionContext): Promise<void>;
  validate?(params: Record<string, unknown>): ValidationResult;
}

export interface ExecutionContext {
  executionId: string;
  userId: string;
  abortSignal: AbortSignal;
  attempt: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: { parameter: string; message: string }[];
}
