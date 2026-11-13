import type { AgentState, AgentRecord } from './types';

export const VALID_AGENT_TRANSITIONS: Record<AgentState, AgentState[]> = {
  CREATED: ['READY', 'CANCELLED'],
  READY: ['RUNNING', 'CANCELLED'],
  RUNNING: [
    'WAITING_APPROVAL',
    'WAITING_EVENT',
    'RETRYING',
    'PAUSED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ],
  WAITING_APPROVAL: ['RUNNING', 'PAUSED', 'FAILED', 'CANCELLED'],
  WAITING_EVENT: ['RUNNING', 'PAUSED', 'FAILED', 'CANCELLED'],
  RETRYING: ['RUNNING', 'FAILED', 'CANCELLED'],
  PAUSED: ['READY', 'CANCELLED'],
  COMPLETED: [],
  FAILED: ['READY', 'CANCELLED'],
  CANCELLED: [],
};

export const TERMINAL_STATES: AgentState[] = ['COMPLETED', 'CANCELLED'];

export class AgentLifecycle {
  static canTransition(from: AgentState, to: AgentState): boolean {
    return VALID_AGENT_TRANSITIONS[from].includes(to);
  }

  static isTerminal(state: AgentState): boolean {
    return TERMINAL_STATES.includes(state);
  }

  static transition(agent: AgentRecord, to: AgentState, reason?: string): void {
    if (!this.canTransition(agent.state, to)) {
      throw new Error(
        `Invalid agent transition: ${agent.state} → ${to} (agent: ${agent.id}${reason ? `, reason: ${reason}` : ''})`,
      );
    }
    agent.state = to;
    agent.updatedAt = new Date().toISOString();

    if (to === 'RUNNING' && !agent.startedAt) {
      agent.startedAt = agent.updatedAt;
    }
    if (to === 'COMPLETED') {
      agent.completedAt = agent.updatedAt;
    }
    if (to === 'FAILED') {
      agent.failedAt = agent.updatedAt;
      if (reason) agent.errorMessage = reason;
    }
    if (to === 'CANCELLED') {
      agent.cancelledAt = agent.updatedAt;
    }
  }

  static tryTransition(agent: AgentRecord, to: AgentState, reason?: string): boolean {
    try {
      this.transition(agent, to, reason);
      return true;
    } catch {
      return false;
    }
  }
}
