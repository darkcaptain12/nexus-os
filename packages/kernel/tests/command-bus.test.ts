import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCommandBus } from '../src/runtime/impl/command-bus.impl';
import { createLogger } from '@apex-os/logger';
import type { Command, CommandMiddleware } from '../src/command-bus/types';

function makeCommand(type: string, payload: unknown = {}): Command {
  return {
    id: crypto.randomUUID(),
    type,
    payload,
    metadata: {
      correlationId: crypto.randomUUID(),
      priority: 'normal',
      timestamp: new Date().toISOString(),
      timeout: 5000,
      retries: 0,
    },
  };
}

describe('InMemoryCommandBus', () => {
  let bus: InMemoryCommandBus;

  beforeEach(() => {
    bus = new InMemoryCommandBus(createLogger({ service: 'test', module: 'commands' }));
  });

  it('dispatches to registered handler', async () => {
    bus.registerHandler('echo', { handle: async (cmd) => cmd.payload });
    const result = await bus.dispatch(makeCommand('echo', { msg: 'hello' }));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ msg: 'hello' });
  });

  it('returns error for missing handler', async () => {
    const result = await bus.dispatch(makeCommand('missing'));
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('HANDLER_NOT_FOUND');
  });

  it('executes middleware pipeline', async () => {
    const order: string[] = [];
    const mw1: CommandMiddleware = async (ctx, next) => {
      order.push('mw1-before');
      const r = await next();
      order.push('mw1-after');
      return r;
    };
    const mw2: CommandMiddleware = async (ctx, next) => {
      order.push('mw2-before');
      const r = await next();
      order.push('mw2-after');
      return r;
    };

    bus.use(mw1);
    bus.use(mw2);
    bus.registerHandler('test', {
      handle: async () => {
        order.push('handler');
        return 'ok';
      },
    });

    await bus.dispatch(makeCommand('test'));
    expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after']);
  });

  it('retries on failure', async () => {
    let attempts = 0;
    bus.registerHandler('flaky', {
      handle: async () => {
        attempts++;
        if (attempts < 3) throw new Error('retry');
        return 'ok';
      },
    });

    const cmd = makeCommand('flaky');
    cmd.metadata.retries = 3;
    const result = await bus.dispatch(cmd);
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });

  it('dead-letters after exhausting retries', async () => {
    bus.registerHandler('fail', {
      handle: async () => {
        throw new Error('always-fail');
      },
    });
    const cmd = makeCommand('fail');
    cmd.metadata.retries = 1;
    const result = await bus.dispatch(cmd);
    expect(result.success).toBe(false);

    const dlq = await bus.getDeadLetterQueue();
    expect(dlq).toHaveLength(1);
  });

  it('tracks metrics', async () => {
    bus.registerHandler('m', { handle: async () => 1 });
    await bus.dispatch(makeCommand('m'));
    const metrics = bus.getMetrics();
    expect(metrics.dispatched).toBe(1);
    expect(metrics.succeeded).toBe(1);
  });
});
