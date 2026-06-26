import type { Command, CommandResult, CommandMiddleware, CommandEnvelope, MiddlewareContext } from '../../command-bus/types';
import type { CommandBus, CommandHandler } from '../../command-bus/interfaces';
import type { Logger } from '@apex-os/logger';

export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler>();
  private middlewares: CommandMiddleware[] = [];
  private deadLetterQueue: CommandEnvelope[] = [];
  private metrics = { dispatched: 0, succeeded: 0, failed: 0 };
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  async dispatch<TPayload, TResult>(command: Command<TPayload>): Promise<CommandResult<TResult>> {
    this.metrics.dispatched++;
    const start = performance.now();
    const handler = this.handlers.get(command.type);

    if (!handler) {
      const result: CommandResult<TResult> = {
        commandId: command.id,
        success: false,
        error: { code: 'HANDLER_NOT_FOUND', message: `No handler for command: ${command.type}`, retryable: false },
        durationMs: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
      this.metrics.failed++;
      return result;
    }

    const context: MiddlewareContext = {
      command,
      metadata: {},
      aborted: false,
      abort(reason: string) {
        this.aborted = true;
        this.metadata['abortReason'] = reason;
      },
    };

    const executeHandler = async (): Promise<CommandResult<TResult>> => {
      if (context.aborted) {
        return {
          commandId: command.id,
          success: false,
          error: {
            code: 'COMMAND_ABORTED',
            message: context.metadata['abortReason'] as string,
            retryable: false,
          },
          durationMs: performance.now() - start,
          timestamp: new Date().toISOString(),
        };
      }

      const timeoutMs = command.metadata.timeout;
      const handlerPromise = handler.handle(command);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Command timeout')), timeoutMs),
      );

      const data = await Promise.race([handlerPromise, timeoutPromise]) as TResult;
      return {
        commandId: command.id,
        success: true,
        data,
        durationMs: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    };

    let pipeline: () => Promise<CommandResult<TResult>> = executeHandler;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i]!;
      const next = pipeline;
      pipeline = () => mw(context, next as () => Promise<CommandResult>) as Promise<CommandResult<TResult>>;
    }

    let lastError: unknown;
    const maxAttempts = command.metadata.retries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await pipeline();
        if (result.success) {
          this.metrics.succeeded++;
          this.log.debug(`Command executed: ${command.type}`, { commandId: command.id, durationMs: result.durationMs });
        } else {
          this.metrics.failed++;
        }
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          this.log.warn(`Command retry ${attempt}/${maxAttempts}: ${command.type}`, { commandId: command.id });
          await new Promise((r) => setTimeout(r, 100 * attempt));
        }
      }
    }

    this.metrics.failed++;
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    this.log.error(`Command failed: ${command.type}`, { commandId: command.id, error: errorMessage });

    this.deadLetterQueue.push({
      command,
      attempt: maxAttempts,
      maxAttempts,
      deadLetterReason: errorMessage,
    });

    return {
      commandId: command.id,
      success: false,
      error: { code: 'COMMAND_FAILED', message: errorMessage, retryable: false },
      durationMs: performance.now() - start,
      timestamp: new Date().toISOString(),
    };
  }

  registerHandler<TPayload, TResult>(commandType: string, handler: CommandHandler<TPayload, TResult>): void {
    this.handlers.set(commandType, handler as CommandHandler);
    this.log.debug(`Command handler registered: ${commandType}`);
  }

  unregisterHandler(commandType: string): void {
    this.handlers.delete(commandType);
  }

  use(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  async getDeadLetterQueue(): Promise<CommandEnvelope[]> {
    return [...this.deadLetterQueue];
  }

  async retryDeadLetter(commandId: string): Promise<CommandResult> {
    const idx = this.deadLetterQueue.findIndex((e) => e.command.id === commandId);
    if (idx === -1) {
      return {
        commandId,
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not in dead letter queue', retryable: false },
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }
    const envelope = this.deadLetterQueue[idx]!;
    this.deadLetterQueue.splice(idx, 1);
    return this.dispatch(envelope.command);
  }

  async purgeDeadLetterQueue(): Promise<number> {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    return count;
  }

  getMetrics() {
    return { ...this.metrics, handlerCount: this.handlers.size, deadLetterCount: this.deadLetterQueue.length };
  }
}
