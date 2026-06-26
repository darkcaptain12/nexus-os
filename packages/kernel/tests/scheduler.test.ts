import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryScheduler } from '../src/runtime/impl/scheduler.impl';
import { createLogger } from '@apex-os/logger';

describe('InMemoryScheduler', () => {
  let scheduler: InMemoryScheduler;

  beforeEach(() => {
    scheduler = new InMemoryScheduler(createLogger({ service: 'test', module: 'scheduler' }));
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('registers a job', () => {
    const job = scheduler.register({
      id: 'test-job',
      name: 'Test Job',
      type: 'interval',
      handler: 'test-handler',
      schedule: { type: 'interval', intervalMs: 60000 },
      status: 'active',
      timezone: 'UTC',
      config: {
        timeout: 5000,
        maxRetries: 1,
        retryDelayMs: 100,
        overlap: false,
        catchUp: false,
        calendarAware: false,
        skipWeekends: false,
        skipHolidays: false,
      },
      metadata: {},
    });
    expect(job.id).toBe('test-job');
    expect(job.runCount).toBe(0);
  });

  it('lists jobs by status', () => {
    scheduler.register({
      id: 'a',
      name: 'A',
      type: 'interval',
      handler: 'h',
      schedule: { type: 'interval', intervalMs: 1000 },
      status: 'active',
      timezone: 'UTC',
      config: { timeout: 5000, maxRetries: 0, retryDelayMs: 0, overlap: false, catchUp: false, calendarAware: false, skipWeekends: false, skipHolidays: false },
      metadata: {},
    });
    expect(scheduler.list('active')).toHaveLength(1);
    expect(scheduler.list('paused')).toHaveLength(0);
  });

  it('pauses and resumes a job', () => {
    scheduler.register({
      id: 'pr',
      name: 'PR',
      type: 'interval',
      handler: 'h',
      schedule: { type: 'interval', intervalMs: 1000 },
      status: 'active',
      timezone: 'UTC',
      config: { timeout: 5000, maxRetries: 0, retryDelayMs: 0, overlap: false, catchUp: false, calendarAware: false, skipWeekends: false, skipHolidays: false },
      metadata: {},
    });
    scheduler.pause('pr');
    expect(scheduler.get('pr')?.status).toBe('paused');
    scheduler.resume('pr');
    expect(scheduler.get('pr')?.status).toBe('active');
  });

  it('triggers a job manually', async () => {
    let executed = false;
    scheduler.registerHandler('manual-handler', async () => { executed = true; });
    scheduler.register({
      id: 'manual',
      name: 'Manual',
      type: 'one-time',
      handler: 'manual-handler',
      schedule: { type: 'one-time', executeAt: new Date(Date.now() + 99999999).toISOString() },
      status: 'active',
      timezone: 'UTC',
      config: { timeout: 5000, maxRetries: 0, retryDelayMs: 0, overlap: false, catchUp: false, calendarAware: false, skipWeekends: false, skipHolidays: false },
      metadata: {},
    });

    const execution = await scheduler.trigger('manual');
    expect(execution.status).toBe('completed');
    expect(executed).toBe(true);
  });

  it('reports stats', () => {
    const stats = scheduler.getStats();
    expect(stats.activeJobs).toBe(0);
    expect(stats.executionsToday).toBe(0);
  });
});
