import { describe, it, expect } from 'vitest';
import { planAgent } from '../src/lib/agents/agent-planner';
import { createAgent } from '../src/lib/agents/agent-runtime';
import { runNextStep } from '../src/lib/agents/agent-runner';

const mockExecutor = async () => ({ ok: true });

describe('Commerce Agent — planner rule', () => {
  it('"para kazandıracak ürün bul" → commerce planı', () => {
    const plan = planAgent('Bana bu ay en çok para kazandıracak ürünü bul');
    const actionIds = plan.steps.map((s) => s.actionId);
    expect(actionIds).toContain('commerce.publishProduct');
    expect(actionIds).toContain('commerce.launchAd');
  });

  it('publish + ad adımları requiresApproval:true (gerçek para/yayın)', () => {
    const plan = planAgent('en çok kazandıracak ürün bul');
    const publish = plan.steps.find((s) => s.actionId === 'commerce.publishProduct');
    const ad = plan.steps.find((s) => s.actionId === 'commerce.launchAd');
    expect(publish!.requiresApproval).toBe(true);
    expect(ad!.requiresApproval).toBe(true);
    expect(publish!.approvalReason).toContain('Approval Queue');
  });

  it('ürün analizi adımı onaysız (para harcamaz)', () => {
    const plan = planAgent('dropship ürün bul');
    const analyze = plan.steps.find((s) => s.name.includes('Analiz'));
    expect(analyze!.requiresApproval).toBe(false);
  });

  it('commerce agent publish adımında WAITING_APPROVAL', async () => {
    const agent = createAgent({ name: 'Commerce Test', goal: 'para kazandıracak ürün bul' });
    // 1. adım (analiz/kayıt) onaysız
    await runNextStep(agent.id, mockExecutor);
    // 2. adım publish → onay bekler
    const result = await runNextStep(agent.id, mockExecutor);
    expect(result.state).toBe('WAITING_APPROVAL');
    expect(result.approvalId).toBeTruthy();
  });
});

describe('Commerce Actions — Action Engine kaydı', () => {
  it("commerce action'ları engine'de kayıtlı ve high/critical risk", async () => {
    const { getActionEngine } = await import('../src/lib/actions/engine-instance');
    const engine = getActionEngine();
    // publish high risk + source ai → pending-approval
    const exec = await engine.submit({
      actionId: 'commerce.publishProduct',
      params: { queueId: crypto.randomUUID() },
      requestedBy: 'test',
      source: 'ai',
      priority: 2,
    });
    expect(exec.status).toBe('pending-approval');
    expect(exec.riskLevel).toBe('high');
  });

  it('reklam başlatma critical risk → approval', async () => {
    const { getActionEngine } = await import('../src/lib/actions/engine-instance');
    const exec = await getActionEngine().submit({
      actionId: 'commerce.launchAd',
      params: { queueId: crypto.randomUUID(), platform: 'meta' },
      requestedBy: 'test',
      source: 'ai',
      priority: 1,
    });
    expect(exec.status).toBe('pending-approval');
    expect(exec.riskLevel).toBe('critical');
  });
});
