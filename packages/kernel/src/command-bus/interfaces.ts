import type { Command, CommandResult, CommandMiddleware, CommandEnvelope } from './types';

export interface CommandBus {
  dispatch<TPayload, TResult>(command: Command<TPayload>): Promise<CommandResult<TResult>>;
  registerHandler<TPayload, TResult>(
    commandType: string,
    handler: CommandHandler<TPayload, TResult>,
  ): void;
  unregisterHandler(commandType: string): void;
  use(middleware: CommandMiddleware): void;
  getDeadLetterQueue(): Promise<CommandEnvelope[]>;
  retryDeadLetter(commandId: string): Promise<CommandResult>;
  purgeDeadLetterQueue(): Promise<number>;
}

export interface CommandHandler<TPayload = unknown, TResult = unknown> {
  handle(command: Command<TPayload>): Promise<TResult>;
}

export interface CommandPipeline {
  addMiddleware(middleware: CommandMiddleware): void;
  execute<T>(command: Command, handler: () => Promise<T>): Promise<CommandResult<T>>;
}

export interface CommandScheduler {
  schedule(command: Command, executeAt: string): string;
  cancel(scheduleId: string): void;
  listScheduled(): { id: string; command: Command; executeAt: string }[];
}
