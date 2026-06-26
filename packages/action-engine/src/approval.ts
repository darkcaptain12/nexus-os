import type { RiskLevel, ApprovalRequest } from './types';

export interface ApprovalPolicy {
  autoApprove: RiskLevel[];
  requireApproval: RiskLevel[];
  expirationMs: number;
}

const DEFAULT_POLICY: ApprovalPolicy = {
  autoApprove: ['low'],
  requireApproval: ['high', 'critical'],
  expirationMs: 300000,
};

export class ApprovalManager {
  private pending = new Map<string, ApprovalRequest>();
  private history: ApprovalRequest[] = [];
  private policy: ApprovalPolicy;

  constructor(policy?: Partial<ApprovalPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  needsApproval(riskLevel: RiskLevel): boolean {
    if (this.policy.autoApprove.includes(riskLevel)) return false;
    if (this.policy.requireApproval.includes(riskLevel)) return true;
    return riskLevel === 'medium';
  }

  createRequest(
    executionId: string,
    actionId: string,
    actionName: string,
    riskLevel: RiskLevel,
    description: string,
    params: Record<string, unknown>,
    requestedBy: string,
  ): ApprovalRequest {
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      executionId,
      actionId,
      actionName,
      riskLevel,
      description,
      params,
      requestedBy,
      status: 'pending',
      expiresAt: new Date(Date.now() + this.policy.expirationMs).toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.pending.set(request.id, request);
    return request;
  }

  approve(approvalId: string, decidedBy: string): ApprovalRequest | null {
    const request = this.pending.get(approvalId);
    if (!request || request.status !== 'pending') return null;

    if (new Date(request.expiresAt) < new Date()) {
      request.status = 'expired';
      this.finalize(request);
      return null;
    }

    request.status = 'approved';
    request.decidedBy = decidedBy;
    request.decidedAt = new Date().toISOString();
    this.finalize(request);
    return request;
  }

  reject(approvalId: string, decidedBy: string, reason?: string): ApprovalRequest | null {
    const request = this.pending.get(approvalId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'rejected';
    request.decidedBy = decidedBy;
    request.decidedAt = new Date().toISOString();
    request.reason = reason;
    this.finalize(request);
    return request;
  }

  getPending(): ApprovalRequest[] {
    this.expireStale();
    return [...this.pending.values()].filter((r) => r.status === 'pending');
  }

  getHistory(limit = 20): ApprovalRequest[] {
    return this.history.slice(-limit);
  }

  getRequest(approvalId: string): ApprovalRequest | undefined {
    return this.pending.get(approvalId) ?? this.history.find((r) => r.id === approvalId);
  }

  private finalize(request: ApprovalRequest): void {
    this.pending.delete(request.id);
    this.history.push(request);
  }

  private expireStale(): void {
    const now = new Date();
    for (const [, request] of this.pending) {
      if (new Date(request.expiresAt) < now && request.status === 'pending') {
        request.status = 'expired';
        this.finalize(request);
      }
    }
  }
}
