import { describe, it, expect } from 'vitest';
import {
  planAgent,
  getCurrentStep,
  isLastStep,
  advanceStep,
} from '../src/lib/agents/agent-planner';

describe('Agent Planner', () => {
  it('returns a plan with steps', () => {
    const plan = planAgent('Görev oluştur');
    expect(plan.goal).toBe('Görev oluştur');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.totalSteps).toBe(plan.steps.length);
    expect(plan.currentStepIndex).toBe(0);
    expect(plan.generatedAt).toBeTruthy();
  });

  it('each step has a unique id', () => {
    const plan = planAgent('Test goal');
    const ids = plan.steps.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('create task goal → task.create step', () => {
    const plan = planAgent('Görev oluştur');
    const createStep = plan.steps.find((s) => s.actionId === 'task.create');
    expect(createStep).toBeDefined();
    expect(createStep?.requiresApproval).toBe(false);
  });

  it('delete task goal → requires approval', () => {
    const plan = planAgent('Görev sil');
    const deleteStep = plan.steps.find((s) => s.actionId === 'task.delete');
    expect(deleteStep).toBeDefined();
    expect(deleteStep?.requiresApproval).toBe(true);
  });

  it('archive project goal → requires approval', () => {
    const plan = planAgent('Proje arşivle');
    const archiveStep = plan.steps.find((s) => s.actionId === 'project.archive');
    expect(archiveStep).toBeDefined();
    expect(archiveStep?.requiresApproval).toBe(true);
  });

  it('notification goal → notification.send step', () => {
    const plan = planAgent('Bildirim gönder');
    const notifyStep = plan.steps.find((s) => s.actionId === 'notification.send');
    expect(notifyStep).toBeDefined();
  });

  it('memory save goal → memory.save step', () => {
    const plan = planAgent('Hafıza kaydet');
    const memStep = plan.steps.find((s) => s.actionId === 'memory.save');
    expect(memStep).toBeDefined();
  });

  it('unknown goal → default 3-step plan', () => {
    const plan = planAgent('Completely unknown goal xyz123');
    expect(plan.steps.length).toBe(3);
    const memStep = plan.steps.find((s) => s.actionId === 'memory.save');
    const notifyStep = plan.steps.find((s) => s.actionId === 'notification.send');
    expect(memStep).toBeDefined();
    expect(notifyStep).toBeDefined();
  });

  it('getCurrentStep returns first step initially', () => {
    const plan = planAgent('Test');
    const step = getCurrentStep(plan);
    expect(step).toBe(plan.steps[0]);
  });

  it('getCurrentStep returns null after all steps', () => {
    const plan = planAgent('Test');
    plan.currentStepIndex = plan.steps.length;
    expect(getCurrentStep(plan)).toBeNull();
  });

  it('isLastStep returns true on last step', () => {
    const plan = planAgent('Bildirim gönder');
    plan.currentStepIndex = plan.steps.length - 1;
    expect(isLastStep(plan)).toBe(true);
  });

  it('advanceStep increments index', () => {
    const plan = planAgent('Test');
    advanceStep(plan);
    expect(plan.currentStepIndex).toBe(1);
  });

  it('complete task goal → requiresApproval true', () => {
    const plan = planAgent('Görev tamamla');
    const completeStep = plan.steps.find((s) => s.requiresApproval);
    expect(completeStep).toBeDefined();
  });
});
