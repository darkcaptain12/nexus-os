import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryEventRuntime } from '../src/runtime/impl/event-runtime.impl';
import { createLogger } from '@apex-os/logger';

function makeEvent(type: string, payload: unknown = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    payload,
    metadata: {
      correlationId: crypto.randomUUID(),
      source: 'test',
      version: 1,
      priority: 'normal' as const,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
    },
  };
}

describe('InMemoryEventRuntime', () => {
  let runtime: InMemoryEventRuntime;

  beforeEach(() => {
    runtime = new InMemoryEventRuntime(createLogger({ service: 'test', module: 'events' }));
  });

  it('publishes and delivers to subscriber', async () => {
    const received: unknown[] = [];
    runtime.subscribe('test.event', async (event) => {
      received.push(event);
    });

    await runtime.publish(makeEvent('test.event', { data: 1 }));
    expect(received).toHaveLength(1);
  });

  it('wildcard subscriber receives all events', async () => {
    const received: unknown[] = [];
    runtime.subscribe('*', async (event) => {
      received.push(event);
    });

    await runtime.publish(makeEvent('a'));
    await runtime.publish(makeEvent('b'));
    expect(received).toHaveLength(2);
  });

  it('unsubscribe stops delivery', async () => {
    const received: unknown[] = [];
    const sub = runtime.subscribe('x', async (event) => {
      received.push(event);
    });

    await runtime.publish(makeEvent('x'));
    runtime.unsubscribe(sub.id);
    await runtime.publish(makeEvent('x'));

    expect(received).toHaveLength(1);
  });

  it('failed handler retries then dead-letters', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'));
    runtime.subscribe('fail.event', handler);

    const event = makeEvent('fail.event');
    event.metadata.maxRetries = 1;
    await runtime.publish(event);

    const dlq = await runtime.getDeadLetterQueue();
    expect(dlq.length).toBeGreaterThan(0);
  });

  it('metrics track published/delivered/failed', async () => {
    runtime.subscribe('ok', async () => {});
    await runtime.publish(makeEvent('ok'));

    const metrics = runtime.getMetrics();
    expect(metrics.published).toBeGreaterThan(0);
    expect(metrics.delivered).toBeGreaterThan(0);
  });

  it('replay returns stored events', async () => {
    await runtime.publish(makeEvent('a'));
    await runtime.publish(makeEvent('b'));

    const events = [];
    for await (const event of runtime.replay({ limit: 10 })) {
      events.push(event);
    }
    expect(events.length).toBe(2);
  });

  it('publishDelayed delivers after delay', async () => {
    const received: unknown[] = [];
    runtime.subscribe('delayed', async (e) => { received.push(e); });

    await runtime.publishDelayed(makeEvent('delayed'), 50);
    expect(received).toHaveLength(0);

    await new Promise((r) => setTimeout(r, 100));
    expect(received).toHaveLength(1);
  });
});
