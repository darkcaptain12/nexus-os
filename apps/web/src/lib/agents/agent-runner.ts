import type { AgentRecord, AgentStep } from './types';
import { AgentLifecycle } from './agent-state-machine';
import { getAgentStore } from './agent-store';
import { getAgentScheduler } from './agent-scheduler';
import { getCurrentStep, advanceStep, isLastStep } from './agent-planner';
import { getApprovalQueue } from '@/lib/ai/approval-queue';
import { getMemoryStore } from '@/lib/memory/store';
import { recordAgentStep } from '@/lib/knowledge/auto-linker';

export type StepExecutor = (step: AgentStep, agent: AgentRecord) => Promise<unknown>;

export async function defaultStepExecutor(step: AgentStep, agent: AgentRecord): Promise<unknown> {
  if (!step.actionId) {
    return { status: 'informational', message: step.description };
  }
  const { getActionEngine } = await import('@/lib/actions/engine-instance');
  const engine = getActionEngine();
  const execution = await engine.submit({
    actionId: step.actionId,
    params: step.params,
    requestedBy: `agent:${agent.id}`,
    source: 'ai',
    priority: agent.priority,
  });

  // High-risk action'larda ActionEngine kendi onay kuyruğunda bekletir. Adım zaten
  // AIApprovalQueue'dan insan onayı aldıysa engine katmanındaki onayı senkronla —
  // tek insan onayı iki katmanı da açar. Onaysız adımlarda high-risk action
  // yine engine'de bekler (savunma derinliği korunur).
  if (execution.status === 'pending-approval' && step.requiresApproval && execution.approvalId) {
    await engine.approveExecution(execution.approvalId, `agent:${agent.id}:user-approved`);
  }

  await engine.processNext();

  if (execution.status === 'pending-approval') {
    throw new Error(
      `Action '${step.actionId}' engine onay kuyruğunda bekliyor — bu adım requiresApproval:true işaretlenmeli`,
    );
  }
  return execution;
}

export async function runNextStep(
  agentId: string,
  executor: StepExecutor = defaultStepExecutor,
): Promise<AgentRecord> {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  if (!agent.plan) throw new Error(`Agent has no plan: ${agentId}`);
  if (AgentLifecycle.isTerminal(agent.state)) return agent;

  const step = getCurrentStep(agent.plan);
  if (!step) {
    AgentLifecycle.transition(agent, 'COMPLETED', 'All steps complete');
    const runtimeMs = agent.startedAt ? Date.now() - new Date(agent.startedAt).getTime() : 0;
    agent.metrics.runtimeMs = runtimeMs;
    getAgentScheduler().markDone(agentId, runtimeMs);
    return agent;
  }

  if (step.status === 'waiting_approval') {
    const queue = getApprovalQueue();
    const approval = agent.approvalId
      ? queue.getAll(200).find((a) => a.id === agent.approvalId)
      : null;

    if (approval?.status === 'approved') {
      step.status = 'running';
      agent.approvalId = undefined;
      agent.metrics.approvalWaitMs += agent.startedAt
        ? Date.now() - new Date(agent.updatedAt).getTime()
        : 0;
      AgentLifecycle.transition(agent, 'RUNNING', 'Approval granted');
    } else if (approval?.status === 'rejected') {
      step.status = 'failed';
      step.error = 'Kullanıcı onaylamadı';
      agent.metrics.stepsFailed++;
      AgentLifecycle.transition(agent, 'FAILED', 'Approval rejected by user');
      getAgentScheduler().markFailed(agentId);
      return agent;
    } else {
      return agent;
    }
  }

  if (step.requiresApproval && step.status === 'pending') {
    AgentLifecycle.tryTransition(agent, 'RUNNING');
    const queue = getApprovalQueue();
    const approval = queue.propose({
      type: 'status_change',
      title: step.name,
      description: step.description,
      reasoning: step.approvalReason ?? `Agent "${agent.name}" bu adım için onay istiyor.`,
      targetId: agentId,
      targetType: 'task',
      action: { agentId, stepId: step.id, actionId: step.actionId },
    });
    step.status = 'waiting_approval';
    step.startedAt = new Date().toISOString();
    agent.approvalId = approval.id;
    agent.currentTask = step.name;
    AgentLifecycle.transition(agent, 'WAITING_APPROVAL', `Step "${step.name}" requires approval`);
    return agent;
  }

  step.status = 'running';
  step.startedAt = new Date().toISOString();
  agent.currentTask = step.name;
  AgentLifecycle.tryTransition(agent, 'RUNNING');

  try {
    const result = await executor(step, agent);
    step.status = 'done';
    step.completedAt = new Date().toISOString();
    step.durationMs = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
    step.result = result;
    agent.metrics.stepsCompleted++;

    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Agent adımı tamamlandı: ${step.name}`,
      description: `[Agent:${agent.id}] ${step.description}`,
      timestamp: step.completedAt,
      metadata: { agentId, stepId: step.id, actionId: step.actionId },
    });

    recordAgentStep(agentId, agent.name, step.name, agent.goal);

    if (isLastStep(agent.plan)) {
      advanceStep(agent.plan);
      AgentLifecycle.transition(agent, 'COMPLETED', 'All steps complete');
      const runtimeMs = agent.startedAt ? Date.now() - new Date(agent.startedAt).getTime() : 0;
      agent.metrics.runtimeMs = runtimeMs;
      getAgentScheduler().markDone(agentId, runtimeMs);
    } else {
      advanceStep(agent.plan);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    step.status = 'failed';
    step.completedAt = new Date().toISOString();
    step.error = error;
    agent.metrics.stepsFailed++;
    agent.retries++;
    agent.metrics.retryCount++;

    if (agent.retries <= agent.maxRetries) {
      AgentLifecycle.transition(agent, 'RETRYING', `Step failed: ${error}`);
      getAgentScheduler().scheduleRetry(agentId, agent.priority, 5000);
    } else {
      AgentLifecycle.transition(agent, 'FAILED', `Max retries exceeded: ${error}`);
      getAgentScheduler().markFailed(agentId);
    }
  }

  return agent;
}

export async function runAllSteps(
  agentId: string,
  executor: StepExecutor = defaultStepExecutor,
): Promise<AgentRecord> {
  const store = getAgentStore();
  let agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  while (
    agent &&
    !AgentLifecycle.isTerminal(agent.state) &&
    agent.state !== 'WAITING_APPROVAL' &&
    agent.state !== 'WAITING_EVENT' &&
    agent.state !== 'PAUSED' &&
    agent.state !== 'RETRYING'
  ) {
    agent = await runNextStep(agentId, executor);
  }
  return agent;
}
