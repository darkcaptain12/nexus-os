import type { LifecyclePhase } from '../../core/types';
import type { LifecycleTransition, BootSequence, ShutdownOptions } from '../../lifecycle/types';
import type { LifecycleManager } from '../../lifecycle/interfaces';
import type { Logger } from '@apex-os/logger';

export class KernelLifecycleManager implements LifecycleManager {
  private phase: LifecyclePhase = 'stopped';
  private history: LifecycleTransition[] = [];
  private transitionHandlers: Array<(transition: LifecycleTransition) => void> = [];
  private shutdownHandlers: Array<{ name: string; handler: () => Promise<void>; priority: number }> = [];
  private bootSteps: Array<{ name: string; fn: () => Promise<void>; critical: boolean }> = [];
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  addBootStep(name: string, fn: () => Promise<void>, critical = true): void {
    this.bootSteps.push({ name, fn, critical });
  }

  addShutdownHandler(name: string, handler: () => Promise<void>, priority = 0): void {
    this.shutdownHandlers.push({ name, handler, priority });
  }

  async boot(): Promise<BootSequence> {
    const sequence: BootSequence = {
      steps: this.bootSteps.map((s, i) => ({
        name: s.name,
        order: i,
        status: 'pending' as const,
        critical: s.critical,
      })),
      totalDurationMs: 0,
      status: 'running',
    };

    const bootStart = performance.now();
    await this.transition('boot', 'boot');

    for (let i = 0; i < this.bootSteps.length; i++) {
      const step = this.bootSteps[i]!;
      const stepState = sequence.steps[i]!;
      stepState.status = 'running';

      const stepStart = performance.now();
      try {
        await step.fn();
        stepState.status = 'completed';
        stepState.durationMs = Math.round(performance.now() - stepStart);
        this.log.info(`Boot step completed: ${step.name}`, { durationMs: stepState.durationMs });
      } catch (err) {
        stepState.status = 'failed';
        stepState.durationMs = Math.round(performance.now() - stepStart);
        stepState.error = err instanceof Error ? err.message : String(err);
        this.log.error(`Boot step failed: ${step.name}`, { error: stepState.error });

        if (step.critical) {
          sequence.status = 'failed';
          sequence.totalDurationMs = Math.round(performance.now() - bootStart);

          for (let j = i + 1; j < sequence.steps.length; j++) {
            sequence.steps[j]!.status = 'skipped';
          }

          await this.transition('safe-mode', 'critical-boot-failure');
          return sequence;
        }
      }
    }

    sequence.status = 'completed';
    sequence.totalDurationMs = Math.round(performance.now() - bootStart);
    await this.transition('running', 'boot-completed');

    this.log.info(`Kernel booted in ${sequence.totalDurationMs}ms`, {
      steps: sequence.steps.length,
      completed: sequence.steps.filter((s) => s.status === 'completed').length,
    });

    return sequence;
  }

  async shutdown(options?: ShutdownOptions): Promise<void> {
    const opts: ShutdownOptions = {
      graceful: true,
      timeout: 10000,
      drainQueues: true,
      saveState: true,
      notifyServices: true,
      ...options,
    };

    await this.transition('shutting-down', 'shutdown-requested');
    this.log.info('Kernel shutting down', { graceful: opts.graceful });

    if (opts.graceful) {
      const sorted = [...this.shutdownHandlers].sort((a, b) => b.priority - a.priority);

      for (const { name, handler } of sorted) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Shutdown handler timeout: ${name}`)), opts.timeout),
          );
          await Promise.race([handler(), timeoutPromise]);
          this.log.debug(`Shutdown handler completed: ${name}`);
        } catch (err) {
          this.log.warn(`Shutdown handler failed: ${name}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    await this.transition('stopped', 'shutdown-completed');
    this.log.info('Kernel stopped');
  }

  async restart(): Promise<void> {
    await this.shutdown({ graceful: true, timeout: 5000, drainQueues: true, saveState: true, notifyServices: true });
    await this.boot();
  }

  async suspend(): Promise<void> {
    await this.transition('suspending', 'suspend-requested');
    await this.transition('suspended', 'suspended');
    this.log.info('Kernel suspended');
  }

  async resume(): Promise<void> {
    await this.transition('resuming', 'resume-requested');
    await this.transition('running', 'resumed');
    this.log.info('Kernel resumed');
  }

  async enterMaintenance(): Promise<void> {
    await this.transition('maintenance', 'maintenance-requested');
    this.log.info('Kernel in maintenance mode');
  }

  async exitMaintenance(): Promise<void> {
    await this.transition('running', 'maintenance-completed');
    this.log.info('Kernel exited maintenance mode');
  }

  async enterSafeMode(): Promise<void> {
    await this.transition('safe-mode', 'safe-mode-requested');
    this.log.warn('Kernel in safe mode');
  }

  async recover(): Promise<void> {
    await this.transition('recovery', 'recovery-started');
    await this.boot();
  }

  getPhase(): LifecyclePhase {
    return this.phase;
  }

  getHistory(): LifecycleTransition[] {
    return [...this.history];
  }

  onTransition(handler: (transition: LifecycleTransition) => void): () => void {
    this.transitionHandlers.push(handler);
    return () => {
      const idx = this.transitionHandlers.indexOf(handler);
      if (idx !== -1) this.transitionHandlers.splice(idx, 1);
    };
  }

  private async transition(to: LifecyclePhase, trigger: string): Promise<void> {
    const from = this.phase;
    const start = performance.now();
    this.phase = to;

    const t: LifecycleTransition = {
      from,
      to,
      trigger,
      timestamp: new Date().toISOString(),
      durationMs: Math.round(performance.now() - start),
    };

    this.history.push(t);
    for (const handler of this.transitionHandlers) {
      handler(t);
    }
  }
}
