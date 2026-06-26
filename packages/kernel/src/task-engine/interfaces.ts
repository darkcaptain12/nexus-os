import type {
  TaskDefinition,
  TaskExecution,
  TaskStatus,
  TaskQueue,
  WorkerInfo,
  TaskDependencyResult,
} from './types';

export interface TaskEngine {
  submit<TPayload>(definition: TaskDefinition<TPayload>): Promise<string>;
  submitBatch(definitions: TaskDefinition[]): Promise<string[]>;
  cancel(taskId: string): Promise<void>;
  retry(taskId: string): Promise<void>;
  getExecution(taskId: string): Promise<TaskExecution | null>;
  listExecutions(status?: TaskStatus): Promise<TaskExecution[]>;
  resolveDependencies(taskId: string): TaskDependencyResult;
  getQueues(): TaskQueue[];
  getWorkers(): WorkerInfo[];
  pauseQueue(queueName: string): void;
  resumeQueue(queueName: string): void;
  drain(queueName: string): Promise<void>;
}

export interface TaskHandler<TPayload = unknown, TResult = unknown> {
  handle(payload: TPayload, context: TaskHandlerContext): Promise<TResult>;
}

export interface TaskHandlerContext {
  taskId: string;
  attempt: number;
  abortSignal: AbortSignal;
  progress(percent: number, message?: string): void;
  checkpoint(data: unknown): Promise<void>;
}

export interface TaskWorkerPool {
  spawn(queue: string, concurrency: number): string;
  terminate(workerId: string): Promise<void>;
  scale(queue: string, concurrency: number): void;
  getWorker(workerId: string): WorkerInfo | undefined;
  listWorkers(): WorkerInfo[];
}
