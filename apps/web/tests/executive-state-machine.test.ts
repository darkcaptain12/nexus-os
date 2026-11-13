import { describe, it, expect, beforeEach } from 'vitest';
import { getStateMachine } from '../src/lib/ai/orchestrator/state-machine';

beforeEach(() => {
  getStateMachine().reset();
});

describe('ExecutiveStateMachine', () => {
  it('starts in IDLE state', () => {
    expect(getStateMachine().getState()).toBe('IDLE');
  });

  it('transitions IDLE → COLLECTING_CONTEXT', () => {
    getStateMachine().transition('COLLECTING_CONTEXT');
    expect(getStateMachine().getState()).toBe('COLLECTING_CONTEXT');
  });

  it('completes valid full cycle', () => {
    const sm = getStateMachine();
    sm.transition('COLLECTING_CONTEXT');
    sm.transition('ANALYZING');
    sm.transition('GENERATING_OPTIONS');
    sm.transition('WAITING_APPROVAL');
    sm.transition('EXECUTING');
    sm.transition('LEARNING');
    sm.transition('IDLE');
    expect(sm.getState()).toBe('IDLE');
  });

  it('rejects invalid transition', () => {
    const sm = getStateMachine();
    expect(() => sm.transition('EXECUTING')).toThrow();
    expect(sm.getState()).toBe('IDLE');
  });

  it('can transition GENERATING_OPTIONS → LEARNING (skip approval)', () => {
    const sm = getStateMachine();
    sm.transition('COLLECTING_CONTEXT');
    sm.transition('ANALYZING');
    sm.transition('GENERATING_OPTIONS');
    sm.transition('LEARNING');
    expect(sm.getState()).toBe('LEARNING');
  });

  it('records transition history', () => {
    const sm = getStateMachine();
    sm.transition('COLLECTING_CONTEXT', 'test reason');
    const transitions = sm.getTransitions();
    expect(transitions[0]!.from).toBe('IDLE');
    expect(transitions[0]!.to).toBe('COLLECTING_CONTEXT');
    expect(transitions[0]!.reason).toBe('test reason');
    expect(transitions[0]!.at).toBeTruthy();
  });

  it('tryTransition returns false on invalid', () => {
    const sm = getStateMachine();
    const result = sm.tryTransition('EXECUTING');
    expect(result).toBe(false);
    expect(sm.getState()).toBe('IDLE');
  });

  it('tryTransition returns true on valid', () => {
    const sm = getStateMachine();
    const result = sm.tryTransition('COLLECTING_CONTEXT');
    expect(result).toBe(true);
  });

  it('FAILED → IDLE recovery', () => {
    const sm = getStateMachine();
    sm.transition('COLLECTING_CONTEXT');
    sm.transition('FAILED');
    sm.transition('IDLE');
    expect(sm.getState()).toBe('IDLE');
  });

  it('getLastTransition returns most recent', () => {
    const sm = getStateMachine();
    sm.transition('COLLECTING_CONTEXT', 'first');
    sm.transition('ANALYZING', 'second');
    expect(sm.getLastTransition()!.reason).toBe('second');
  });
});
