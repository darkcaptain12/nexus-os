import type { KernelConfig, LifecyclePhase, ServiceMetadata, Result } from '../../core/types';
import type {
  Kernel,
  DependencyContainer,
  ServiceRegistryPort,
  CommandBusPort,
  QueryBusPort,
  EventRuntimePort,
  WorkflowRuntimePort,
  TaskEnginePort,
  SchedulerPort,
  PluginManagerPort,
  HealthMonitorPort,
  StateManagerPort,
} from '../../core/interfaces';
import type { Logger } from '@apex-os/logger';
import { createLogger } from '@apex-os/logger';

import { KernelContainer } from './container.impl';
import { InMemoryServiceRegistry } from './service-registry.impl';
import { InMemoryEventRuntime } from './event-runtime.impl';
import { InMemoryCommandBus } from './command-bus.impl';
import { InMemoryQueryBus } from './query-bus.impl';
import { InMemoryScheduler } from './scheduler.impl';
import { InMemoryHealthMonitor } from './health-monitor.impl';
import { InMemoryStateManager } from './state-manager.impl';
import { KernelLifecycleManager } from './lifecycle-manager.impl';

const KERNEL_VERSION = '0.1.0';

export class NexusKernel implements Kernel {
  readonly config: KernelConfig;

  private _phase: LifecyclePhase = 'stopped';
  private _container: KernelContainer;
  private _services: InMemoryServiceRegistry;
  private _events: InMemoryEventRuntime;
  private _commands: InMemoryCommandBus;
  private _queries: InMemoryQueryBus;
  private _scheduler: InMemoryScheduler;
  private _health: InMemoryHealthMonitor;
  private _state: InMemoryStateManager;
  private _lifecycle: KernelLifecycleManager;
  private _log: Logger;
  private _bootTime?: number;

  constructor(config?: Partial<KernelConfig>) {
    this.config = {
      environment: (process.env.NODE_ENV as KernelConfig['environment']) ?? 'development',
      debug: process.env.NODE_ENV !== 'production',
      services: [],
      plugins: [],
      scheduler: {
        timezone: 'Europe/Istanbul',
        maxConcurrentJobs: 10,
        defaultRetries: 3,
        defaultTimeout: 30000,
      },
      health: {
        checkInterval: 30000,
        degradedThreshold: 80,
        unhealthyThreshold: 50,
        alertChannels: [],
      },
      ...config,
    };

    this._log = createLogger({ service: 'kernel', module: 'core' });
    this._container = new KernelContainer();
    this._services = new InMemoryServiceRegistry(this._log.child({ module: 'registry' }) as Logger);
    this._events = new InMemoryEventRuntime(this._log.child({ module: 'events' }) as Logger);
    this._commands = new InMemoryCommandBus(this._log.child({ module: 'commands' }) as Logger);
    this._queries = new InMemoryQueryBus(this._log.child({ module: 'queries' }) as Logger);
    this._scheduler = new InMemoryScheduler(this._log.child({ module: 'scheduler' }) as Logger);
    this._health = new InMemoryHealthMonitor(this._log.child({ module: 'health' }) as Logger, this.config.health.checkInterval);
    this._state = new InMemoryStateManager();
    this._lifecycle = new KernelLifecycleManager(this._log.child({ module: 'lifecycle' }) as Logger);

    this.registerCoreServices();
    this.registerHealthChecks();
    this.setupBootSequence();
  }

  get phase(): LifecyclePhase {
    return this._phase;
  }

  get container(): DependencyContainer {
    return this._container;
  }

  get services(): ServiceRegistryPort {
    return {
      register: (m: ServiceMetadata) => this._services.register(m),
      get: (id: string) => this._services.get(id)?.metadata,
      list: () => this._services.list().map((e) => e.metadata),
      getStatus: (id: string) => this._services.get(id)?.metadata.status ?? 'stopped',
    };
  }

  get commands(): CommandBusPort {
    return {
      dispatch: async <R>(cmd: { type: string; payload: unknown }) => {
        const result = await this._commands.dispatch({
          id: crypto.randomUUID(),
          type: cmd.type,
          payload: cmd.payload,
          metadata: {
            correlationId: crypto.randomUUID(),
            priority: 'normal',
            timestamp: new Date().toISOString(),
            timeout: 30000,
            retries: 0,
          },
        });
        return result as Result<R>;
      },
    };
  }

  get queries(): QueryBusPort {
    return {
      query: async <R>(q: { type: string; payload: unknown }) => {
        const result = await this._queries.query({
          id: crypto.randomUUID(),
          type: q.type,
          payload: q.payload,
          metadata: {
            correlationId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            timeout: 30000,
            cache: { enabled: false, ttl: 0 },
          },
        });
        return result as Result<R>;
      },
    };
  }

  get events(): EventRuntimePort {
    return {
      publish: async (e) => {
        await this._events.publish({
          id: crypto.randomUUID(),
          type: e.type,
          payload: e.payload,
          metadata: {
            correlationId: crypto.randomUUID(),
            source: 'kernel',
            version: 1,
            priority: 'normal',
            timestamp: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 3,
          },
        });
      },
      subscribe: (type, handler) => {
        const sub = this._events.subscribe(type, async (event) => {
          await handler(event);
        });
        return () => this._events.unsubscribe(sub.id);
      },
    };
  }

  get workflows(): WorkflowRuntimePort {
    return {
      start: async () => { throw new Error('Workflow runtime not yet implemented'); },
      pause: async () => { throw new Error('Workflow runtime not yet implemented'); },
      resume: async () => { throw new Error('Workflow runtime not yet implemented'); },
      cancel: async () => { throw new Error('Workflow runtime not yet implemented'); },
    };
  }

  get tasks(): TaskEnginePort {
    return {
      submit: async () => { throw new Error('Task engine not yet implemented'); },
      cancel: async () => { throw new Error('Task engine not yet implemented'); },
      getStatus: async () => { throw new Error('Task engine not yet implemented'); },
    };
  }

  get scheduler(): SchedulerPort {
    return {
      schedule: (jobId, cron, handler) => {
        this._scheduler.register({
          id: jobId,
          name: jobId,
          type: 'cron',
          handler,
          schedule: { type: 'cron', expression: cron },
          status: 'active',
          timezone: this.config.scheduler.timezone,
          config: {
            timeout: this.config.scheduler.defaultTimeout,
            maxRetries: this.config.scheduler.defaultRetries,
            retryDelayMs: 1000,
            overlap: false,
            catchUp: false,
            calendarAware: false,
            skipWeekends: false,
            skipHolidays: false,
          },
          metadata: {},
        });
      },
      unschedule: (jobId) => this._scheduler.unregister(jobId),
      listJobs: () =>
        this._scheduler.list().map((j) => ({
          id: j.id,
          cron: j.schedule.type === 'cron' ? j.schedule.expression : '',
          nextRun: j.nextRunAt ?? '',
        })),
    };
  }

  get plugins(): PluginManagerPort {
    return {
      install: async () => { throw new Error('Plugin manager not yet implemented'); },
      enable: async () => { throw new Error('Plugin manager not yet implemented'); },
      disable: async () => { throw new Error('Plugin manager not yet implemented'); },
      list: () => this.config.plugins,
    };
  }

  get health(): HealthMonitorPort {
    return {
      check: () => this._health.toReport(),
      getScore: () => this._health.getScore(),
    };
  }

  get state(): StateManagerPort {
    return {
      get: <T>(key: string) => this._state.get<T>(key),
      set: <T>(key: string, value: T) => this._state.set(key, value),
      snapshot: () => this._state.snapshot().entries,
      restore: (snapshot: Record<string, unknown>) =>
        this._state.restore({
          id: crypto.randomUUID(),
          scope: 'application',
          entries: snapshot,
          createdAt: new Date().toISOString(),
        }),
    };
  }

  async boot(): Promise<void> {
    const bootSequence = await this._lifecycle.boot();
    this._phase = this._lifecycle.getPhase();
    this._bootTime = bootSequence.totalDurationMs;

    if (bootSequence.status === 'completed') {
      this._state.set('kernel.version', KERNEL_VERSION, 'runtime');
      this._state.set('kernel.bootTime', this._bootTime, 'runtime');
      this._state.set('kernel.bootedAt', new Date().toISOString(), 'runtime');

      await this.events.publish({
        type: 'kernel.booted',
        payload: {
          version: KERNEL_VERSION,
          bootTimeMs: this._bootTime,
          services: this._services.list().length,
          environment: this.config.environment,
        },
      });
    }
  }

  async shutdown(graceful = true): Promise<void> {
    await this._lifecycle.shutdown({
      graceful,
      timeout: 10000,
      drainQueues: true,
      saveState: true,
      notifyServices: true,
    });
    this._phase = this._lifecycle.getPhase();
  }

  async restart(): Promise<void> {
    await this._lifecycle.restart();
    this._phase = this._lifecycle.getPhase();
  }

  getStatus() {
    return {
      version: KERNEL_VERSION,
      phase: this._phase,
      environment: this.config.environment,
      bootTimeMs: this._bootTime,
      uptime: this._state.get<string>('kernel.bootedAt', 'runtime')
        ? Date.now() - new Date(this._state.get<string>('kernel.bootedAt', 'runtime')!).getTime()
        : 0,
      services: {
        total: this._services.list().length,
        running: this._services.list({ status: 'running' }).length,
        failed: this._services.list({ status: 'failed' }).length,
      },
      events: this._events.getMetrics(),
      commands: this._commands.getMetrics(),
      queries: this._queries.getMetrics(),
      scheduler: this._scheduler.getStats(),
      health: this._health.getScore(),
      container: this._container.getStats(),
    };
  }

  getCommandBus() { return this._commands; }
  getQueryBus() { return this._queries; }
  getEventRuntime() { return this._events; }
  getScheduler() { return this._scheduler; }
  getHealthMonitor() { return this._health; }
  getServiceRegistry() { return this._services; }
  getLifecycle() { return this._lifecycle; }

  private registerCoreServices(): void {
    this._container.registerValue('kernel.config', this.config);
    this._container.registerValue('kernel.logger', this._log);
    this._container.registerSingleton('kernel.container', () => this._container);
    this._container.registerSingleton('kernel.events', () => this._events);
    this._container.registerSingleton('kernel.commands', () => this._commands);
    this._container.registerSingleton('kernel.queries', () => this._queries);
    this._container.registerSingleton('kernel.scheduler', () => this._scheduler);
    this._container.registerSingleton('kernel.health', () => this._health);
    this._container.registerSingleton('kernel.state', () => this._state);
    this._container.registerSingleton('kernel.lifecycle', () => this._lifecycle);

    const coreServices: Array<{ id: string; name: string; deps: string[] }> = [
      { id: 'container', name: 'DI Container', deps: [] },
      { id: 'registry', name: 'Service Registry', deps: ['container'] },
      { id: 'events', name: 'Event Runtime', deps: ['container'] },
      { id: 'commands', name: 'Command Bus', deps: ['events'] },
      { id: 'queries', name: 'Query Bus', deps: [] },
      { id: 'scheduler', name: 'Scheduler', deps: ['events'] },
      { id: 'health', name: 'Health Monitor', deps: [] },
      { id: 'state', name: 'State Manager', deps: [] },
    ];

    for (const svc of coreServices) {
      this._services.register({
        id: svc.id,
        name: svc.name,
        version: KERNEL_VERSION,
        description: `Core kernel service: ${svc.name}`,
        owner: 'kernel',
        scope: 'singleton',
        status: 'registered',
        dependencies: svc.deps,
        exports: [],
        permissions: [],
        tags: ['core', 'kernel'],
        registeredAt: new Date().toISOString(),
      });
    }
  }

  private registerHealthChecks(): void {
    this._health.registerCheck('memory', {
      check: async () => {
        const mem = process.memoryUsage();
        const heapPercentage = (mem.heapUsed / mem.heapTotal) * 100;
        return {
          status: heapPercentage < 90 ? 'healthy' : heapPercentage < 98 ? 'degraded' : 'unhealthy',
          latencyMs: 0,
          details: {
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            rss: Math.round(mem.rss / 1024 / 1024),
            percentage: Math.round(heapPercentage),
          },
        };
      },
    });

    this._health.registerCheck('event-runtime', {
      check: async () => {
        const metrics = this._events.getMetrics();
        const healthy = metrics.published === 0 || metrics.failed < metrics.published * 0.1;
        return {
          status: healthy ? 'healthy' : 'degraded',
          latencyMs: 0,
          details: metrics,
        };
      },
    });

    this._health.registerCheck('command-bus', {
      check: async () => {
        const metrics = this._commands.getMetrics();
        const healthy = metrics.dispatched === 0 || metrics.failed < metrics.dispatched * 0.1;
        return {
          status: healthy ? 'healthy' : 'degraded',
          latencyMs: 0,
          details: metrics,
        };
      },
    });
  }

  private setupBootSequence(): void {
    this._lifecycle.addBootStep('configuration', async () => {
      this._log.info('Loading configuration', { environment: this.config.environment });
    });

    this._lifecycle.addBootStep('container', async () => {
      const errors = this._container.validateDependencies();
      if (errors.length > 0) {
        this._log.warn('Circular dependencies detected', { count: errors.length });
      }
      this._services.updateStatus('container', 'running');
    });

    this._lifecycle.addBootStep('service-registry', async () => {
      const graph = this._services.getDependencyGraph();
      if (graph.hasCycles) {
        throw new Error(`Service dependency cycles: ${JSON.stringify(graph.cycles)}`);
      }
      this._services.updateStatus('registry', 'running');
    });

    this._lifecycle.addBootStep('event-runtime', async () => {
      this._services.updateStatus('events', 'running');
    });

    this._lifecycle.addBootStep('command-bus', async () => {
      this._services.updateStatus('commands', 'running');
    });

    this._lifecycle.addBootStep('query-bus', async () => {
      this._services.updateStatus('queries', 'running');
    });

    this._lifecycle.addBootStep('scheduler', async () => {
      this._scheduler.start();
      this._services.updateStatus('scheduler', 'running');
    });

    this._lifecycle.addBootStep('health-monitor', async () => {
      this._health.start();
      this._services.updateStatus('health', 'running');
    });

    this._lifecycle.addBootStep('state-manager', async () => {
      this._services.updateStatus('state', 'running');
    });

    this._lifecycle.addShutdownHandler('scheduler', async () => {
      this._scheduler.stop();
    }, 10);

    this._lifecycle.addShutdownHandler('health-monitor', async () => {
      this._health.stop();
    }, 5);

    this._lifecycle.addShutdownHandler('event-runtime', async () => {
      this._events.dispose();
    }, 3);

    this._lifecycle.addShutdownHandler('container', async () => {
      await this._container.dispose();
    }, 1);
  }
}

export function createKernel(config?: Partial<KernelConfig>): NexusKernel {
  return new NexusKernel(config);
}
