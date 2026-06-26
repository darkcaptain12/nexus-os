export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type ActionCategory =
  | 'data-read'
  | 'data-write'
  | 'data-delete'
  | 'external-api'
  | 'financial'
  | 'communication'
  | 'system'
  | 'automation';

export interface SafetyPolicy {
  id: string;
  name: string;
  description: string;
  rules: SafetyRule[];
  enabled: boolean;
  version: string;
}

export interface SafetyRule {
  id: string;
  action: string;
  condition: RuleCondition;
  effect: 'allow' | 'deny' | 'require-approval' | 'log';
  riskLevel: RiskLevel;
  message: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater-than' | 'in';
  value: unknown;
}

export interface SafetyCheckInput {
  action: string;
  category: ActionCategory;
  agentId: string;
  userId?: string;
  toolName?: string;
  parameters: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface SafetyCheckOutput {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  matchedRules: SafetyRule[];
  risks: IdentifiedRisk[];
  recommendation: string;
}

export interface IdentifiedRisk {
  category: string;
  level: RiskLevel;
  description: string;
  mitigation?: string;
}

export interface ApprovalRequest {
  id: string;
  action: string;
  agentId: string;
  riskLevel: RiskLevel;
  description: string;
  parameters: Record<string, unknown>;
  risks: IdentifiedRisk[];
  requestedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  decidedBy?: string;
  decidedAt?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  category: ActionCategory;
  agentId: string;
  userId?: string;
  riskLevel: RiskLevel;
  allowed: boolean;
  approvalId?: string;
  parameters: Record<string, unknown>;
  result?: string;
  timestamp: string;
}

export interface RateLimitState {
  identifier: string;
  windowStart: string;
  requestCount: number;
  tokenCount: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}
