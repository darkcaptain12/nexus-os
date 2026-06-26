import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionQueue } from '../src/queue';
import type { ActionExecution } from '../src/types';

function makeExecution(overrides: Partial<ActionExecution> = {}): ActionExecution {
  return {
    id: crypto.randomUUID(),
    actionId: 'test',
    actionName: 'Test',
    category: 'notification',
    riskLevel: 'low',
    status: 'queued',
    params: {},
    requestedBy: 'user',
    source: 'user',
    priority: overrides.priority ?? 5,
    attempt: 1,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ExecutionQueue', () => {
  let queue: ExecutionQueue;

  beforeEach(() => {
    queue = new ExecutionQueue(2);
  });

  it('enqueues and dequeues', () => {
    queue.enqueue(makeExecution());
    const ex = queue.dequeue();
    expect(ex).toBeDefined();
    expect(ex?.status).toBe('running');
  });

  it('respects concurrency limit', () => {
    queue.enqueue(makeExecution());
    queue.enqueue(makeExecution());
    queue.enqueue(makeExecution());
    queue.dequeue();
    queue.dequeue();
    const third = queue.dequeue();
    expect(third).toBeUndefined();
  });

  it('priority ordering', () => {
    queue.enqueue(makeExecution({ priority: 1 }));
    queue.enqueue(makeExecution({ priority: 10 }));
    const first = queue.dequeue();
    expect(first?.priority).toBe(10);
  });

  it('complete marks finished', () => {
    queue.enqueue(makeExecution({ id: 'x' }));
    queue.dequeue();
    queue.complete('x', 'result');
    const ex = queue.getExecution('x');
    expect(ex?.status).toBe('completed');
    expect(ex?.result).toBe('result');
  });

  it('fail retries then dead-letters', () => {
    const ex = makeExecution({ id: 'fail-me', maxAttempts: 2 });
    queue.enqueue(ex);
    queue.dequeue();
    queue.fail('fail-me', 'error1');

    const retried = queue.dequeue();
    expect(retried?.attempt).toBe(2);

    queue.fail('fail-me', 'error2');
    expect(queue.getDeadLetterQueue()).toHaveLength(1);
  });

  it('cancel removes from queue', () => {
    const ex = makeExecution({ id: 'cancel-me' });
    queue.enqueue(ex);
    expect(queue.cancel('cancel-me')).toBe(true);
    expect(queue.getStats().cancelled).toBe(1);
  });

  it('stats are accurate', () => {
    queue.enqueue(makeExecution());
    queue.enqueue(makeExecution());
    const stats = queue.getStats();
    expect(stats.queued).toBe(2);
    expect(stats.running).toBe(0);
  });
});
