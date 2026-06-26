import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalManager } from '../src/approval';

describe('ApprovalManager', () => {
  let manager: ApprovalManager;

  beforeEach(() => {
    manager = new ApprovalManager({ expirationMs: 60000 });
  });

  it('low risk does not need approval', () => {
    expect(manager.needsApproval('low')).toBe(false);
  });

  it('high risk needs approval', () => {
    expect(manager.needsApproval('high')).toBe(true);
  });

  it('critical risk needs approval', () => {
    expect(manager.needsApproval('critical')).toBe(true);
  });

  it('medium risk needs approval by default', () => {
    expect(manager.needsApproval('medium')).toBe(true);
  });

  it('creates approval request', () => {
    const request = manager.createRequest('exec-1', 'action-1', 'Test', 'high', 'desc', {}, 'user');
    expect(request.status).toBe('pending');
    expect(request.executionId).toBe('exec-1');
  });

  it('approves request', () => {
    const request = manager.createRequest('exec-1', 'action-1', 'Test', 'high', 'desc', {}, 'user');
    const approved = manager.approve(request.id, 'admin');
    expect(approved?.status).toBe('approved');
    expect(approved?.decidedBy).toBe('admin');
  });

  it('rejects request', () => {
    const request = manager.createRequest('exec-1', 'action-1', 'Test', 'high', 'desc', {}, 'user');
    const rejected = manager.reject(request.id, 'admin', 'Too risky');
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.reason).toBe('Too risky');
  });

  it('cannot approve twice', () => {
    const request = manager.createRequest('exec-1', 'action-1', 'Test', 'high', 'desc', {}, 'user');
    manager.approve(request.id, 'admin');
    const second = manager.approve(request.id, 'admin');
    expect(second).toBeNull();
  });

  it('lists pending requests', () => {
    manager.createRequest('exec-1', 'a-1', 'A', 'high', 'd', {}, 'u');
    manager.createRequest('exec-2', 'a-2', 'B', 'critical', 'd', {}, 'u');
    expect(manager.getPending()).toHaveLength(2);
  });

  it('expired requests auto-expire', () => {
    const mgr = new ApprovalManager({ expirationMs: -1 });
    mgr.createRequest('exec-1', 'a-1', 'A', 'high', 'd', {}, 'u');
    expect(mgr.getPending()).toHaveLength(0);
  });

  it('history tracks decided requests', () => {
    const req = manager.createRequest('exec-1', 'a-1', 'A', 'high', 'd', {}, 'u');
    manager.approve(req.id, 'admin');
    expect(manager.getHistory()).toHaveLength(1);
  });
});
