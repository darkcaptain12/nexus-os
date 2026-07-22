import type { ExecutiveState, StateTransition } from '../types';

const VALID_TRANSITIONS: Record<ExecutiveState, ExecutiveState[]> = {
  IDLE: ['COLLECTING_CONTEXT', 'FAILED'],
  COLLECTING_CONTEXT: ['ANALYZING', 'FAILED'],
  ANALYZING: ['GENERATING_OPTIONS', 'FAILED'],
  GENERATING_OPTIONS: ['WAITING_APPROVAL', 'LEARNING', 'FAILED'],
  WAITING_APPROVAL: ['EXECUTING', 'LEARNING', 'FAILED'],
  EXECUTING: ['LEARNING', 'FAILED'],
  LEARNING: ['IDLE', 'FAILED'],
  FAILED: ['IDLE'],
};

class ExecutiveStateMachine {
  private state: ExecutiveState = 'IDLE';
  private transitions: StateTransition[] = [];
  private readonly MAX_TRANSITIONS = 200;

  getState(): ExecutiveState {
    return this.state;
  }

  transition(to: ExecutiveState, reason?: string): void {
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid transition: ${this.state} → ${to}. Allowed: [${allowed.join(', ')}]`,
      );
    }
    const t: StateTransition = { from: this.state, to, at: new Date().toISOString(), reason };
    this.transitions.push(t);
    if (this.transitions.length > this.MAX_TRANSITIONS) {
      this.transitions.splice(0, this.transitions.length - this.MAX_TRANSITIONS);
    }
    this.state = to;
  }

  tryTransition(to: ExecutiveState, reason?: string): boolean {
    try {
      this.transition(to, reason);
      return true;
    } catch {
      return false;
    }
  }

  getTransitions(limit = 50): StateTransition[] {
    return this.transitions.slice(-limit).reverse();
  }

  getLastTransition(): StateTransition | undefined {
    return this.transitions[this.transitions.length - 1];
  }

  reset(): void {
    this.state = 'IDLE';
  }
}

let _instance: ExecutiveStateMachine | null = null;

export function getStateMachine(): ExecutiveStateMachine {
  if (!_instance) _instance = new ExecutiveStateMachine();
  return _instance;
}
