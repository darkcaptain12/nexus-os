import type { AgentRecord, CreateAgentInput } from './types';
import { AgentLifecycle } from './agent-state-machine';
import { getAgentStore } from './agent-store';
import { getAgentScheduler } from './agent-scheduler';
import { planAgent } from './agent-planner';
import { runAllSteps, runNextStep, type StepExecutor } from './agent-runner';
import { getMemoryStore } from '@/lib/memory/store';
import { getApprovalQueue } from '@/lib/ai/approval-queue';
import { recordAgentCreated } from '@/lib/knowledge/auto-linker';

function makeAgent(input: CreateAgentInput): AgentRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    goal: input.goal,
    state: 'CREATED',
    memoryRef: `agent:${crypto.randomUUID()}`,
    retries: 0,
    maxRetries: input.maxRetries ?? 3,
    priority: input.priority ?? 3,
    createdAt: now,
    updatedAt: now,
    metrics: {
      runtimeMs: 0,
      retryCount: 0,
      approvalWaitMs: 0,
      workflowDurationMs: 0,
      stepCount: 0,
      stepsCompleted: 0,
      stepsFailed: 0,
    },
  };
}

export function createAgent(input: CreateAgentInput): AgentRecord {
  const agent = makeAgent(input);
  agent.plan = planAgent(input.goal);
  agent.metrics.stepCount = agent.plan.totalSteps;

  AgentLifecycle.transition(agent, 'READY', 'Agent created and planned');

  getAgentStore().add(agent);

  getMemoryStore().addTimelineEntry({
    source: 'decision',
    title: `Agent oluşturuldu: ${agent.name}`,
    description: `Hedef: ${agent.goal} | ${agent.plan.totalSteps} adım planlandı`,
    timestamp: agent.createdAt,
    metadata: { agentId: agent.id, priority: agent.priority },
  });

  getAgentScheduler().enqueue(agent.id, agent.priority);

  recordAgentCreated(agent.id, agent.name, agent.goal);

  return agent;
}

export async function startAgent(agentId: string, executor?: StepExecutor): Promise<AgentRecord> {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  if (agent.state !== 'READY') throw new Error(`Agent not in READY state: ${agent.state}`);

  const scheduler = getAgentScheduler();
  scheduler.markRunning(agentId);
  AgentLifecycle.transition(agent, 'RUNNING', 'Execution started');

  return runAllSteps(agentId, executor);
}

export function pauseAgent(agentId: string): AgentRecord {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  AgentLifecycle.transition(agent, 'PAUSED', 'Paused by user');
  getAgentScheduler().remove(agentId);
  return agent;
}

export function resumeAgent(agentId: string): AgentRecord {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  AgentLifecycle.transition(agent, 'READY', 'Resumed by user');
  getAgentScheduler().enqueue(agentId, agent.priority);
  return agent;
}

export function cancelAgent(agentId: string): AgentRecord {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  AgentLifecycle.transition(agent, 'CANCELLED', 'Cancelled by user');
  getAgentScheduler().remove(agentId);

  getMemoryStore().addTimelineEntry({
    source: 'decision',
    title: `Agent iptal edildi: ${agent.name}`,
    description: `[Agent:${agentId}] kullanıcı tarafından iptal edildi`,
    timestamp: new Date().toISOString(),
    metadata: { agentId, goal: agent.goal },
  });

  return agent;
}

export async function resumeAfterApproval(
  agentId: string,
  approved: boolean,
  executor?: StepExecutor,
): Promise<AgentRecord> {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  if (agent.state !== 'WAITING_APPROVAL') {
    throw new Error(`Agent not in WAITING_APPROVAL state: ${agent.state}`);
  }

  if (agent.approvalId) {
    const queue = getApprovalQueue();
    if (approved) {
      queue.approve(agent.approvalId);
    } else {
      queue.reject(agent.approvalId);
    }
  }

  if (!approved) {
    AgentLifecycle.transition(agent, 'FAILED', 'Approval rejected by user');
    getAgentScheduler().markFailed(agentId);
    return agent;
  }

  getAgentScheduler().markRunning(agentId);
  await runNextStep(agentId, executor);
  return runAllSteps(agentId, executor);
}

export function recoverAgent(agentId: string): AgentRecord {
  const store = getAgentStore();
  const agent = store.get(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  agent.retries = 0;
  agent.errorMessage = undefined;

  if (agent.plan) {
    const currentStep = agent.plan.steps[agent.plan.currentStepIndex];
    if (currentStep?.status === 'failed') {
      currentStep.status = 'pending';
      currentStep.error = undefined;
    }
  }

  AgentLifecycle.transition(agent, 'READY', 'Manually recovered by user');
  getAgentScheduler().enqueue(agentId, agent.priority);
  return agent;
}
