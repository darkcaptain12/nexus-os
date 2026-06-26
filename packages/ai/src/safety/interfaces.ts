import type {
  SafetyPolicy,
  SafetyCheckInput,
  SafetyCheckOutput,
  ApprovalRequest,
  AuditEntry,
  RateLimitState,
} from './types';

export interface SafetyGuardService {
  check(input: SafetyCheckInput): Promise<SafetyCheckOutput>;
  checkBatch(inputs: SafetyCheckInput[]): Promise<SafetyCheckOutput[]>;
}

export interface PolicyManager {
  addPolicy(policy: SafetyPolicy): void;
  removePolicy(policyId: string): void;
  enablePolicy(policyId: string): void;
  disablePolicy(policyId: string): void;
  listPolicies(): SafetyPolicy[];
  evaluate(input: SafetyCheckInput): SafetyCheckOutput;
}

export interface ApprovalManager {
  requestApproval(input: SafetyCheckInput): Promise<ApprovalRequest>;
  approve(requestId: string, userId: string): Promise<void>;
  deny(requestId: string, userId: string, reason: string): Promise<void>;
  getPending(): Promise<ApprovalRequest[]>;
  getRequest(requestId: string): Promise<ApprovalRequest | null>;
  expireStale(): Promise<number>;
}

export interface AuditLogger {
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void;
  query(filter: AuditFilter): Promise<AuditEntry[]>;
  getRecentEntries(limit: number): Promise<AuditEntry[]>;
}

export interface AuditFilter {
  agentId?: string;
  userId?: string;
  action?: string;
  riskLevel?: string;
  allowed?: boolean;
  from?: string;
  to?: string;
}

export interface RateLimiter {
  check(identifier: string): RateLimitState;
  consume(identifier: string, tokens: number): boolean;
  reset(identifier: string): void;
}

export interface DangerousActionDetector {
  isDangerous(action: string, parameters: Record<string, unknown>): boolean;
  classify(action: string): import('./types').ActionCategory;
  getRestrictions(category: import('./types').ActionCategory): string[];
}
