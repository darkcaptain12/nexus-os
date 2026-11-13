import { describe, it, expect } from 'vitest';
import { planAgent } from '../src/lib/agents/agent-planner';
import { createAgent } from '../src/lib/agents/agent-runtime';
import { runNextStep } from '../src/lib/agents/agent-runner';

const mockExecutor = async () => ({ ok: true });

describe('Trading Agent (Agent Runtime entegrasyonu)', () => {
  it('trading hedefi trading planı üretir: Analiz→Risk→Emir→Kayıt', () => {
    const plan = planAgent('Trading analizi yap: BTCUSDT');
    const actionIds = plan.steps.map((s) => s.actionId);
    expect(actionIds).toEqual([
      'trade.analyze',
      'trade.riskCheck',
      'trade.paperOrder',
      'memory.save',
    ]);
  });

  it('emir adımı HER ZAMAN onay gerektirir', () => {
    const plan = planAgent('BTCUSDT long pozisyon aç');
    const orderStep = plan.steps.find((s) => s.actionId === 'trade.paperOrder');
    expect(orderStep).toBeDefined();
    expect(orderStep!.requiresApproval).toBe(true);
    expect(orderStep!.approvalReason).toContain('Approval Queue');
  });

  it('analiz ve risk adımları onaysız (bilgi üretimi)', () => {
    const plan = planAgent('trade et');
    expect(plan.steps.find((s) => s.actionId === 'trade.analyze')!.requiresApproval).toBe(false);
    expect(plan.steps.find((s) => s.actionId === 'trade.riskCheck')!.requiresApproval).toBe(false);
  });

  it('trading agent emir adımında WAITING_APPROVAL durumuna geçer', async () => {
    const agent = createAgent({ name: 'Trading Test', goal: 'Trading analizi yap: BTCUSDT' });
    // İlk iki adım (analyze, riskCheck) onaysız — mock executor ile koş
    await runNextStep(agent.id, mockExecutor);
    await runNextStep(agent.id, mockExecutor);
    // Üçüncü adım: paper emir → onay beklemeli
    const result = await runNextStep(agent.id, mockExecutor);
    expect(result.state).toBe('WAITING_APPROVAL');
    expect(result.approvalId).toBeTruthy();
    expect(result.plan!.steps[2]!.status).toBe('waiting_approval');
  });

  it('ingilizce trading hedefi de eşleşir', () => {
    const plan = planAgent('open a long trade on ETH');
    expect(plan.steps.some((s) => s.actionId === 'trade.paperOrder')).toBe(true);
  });
});
