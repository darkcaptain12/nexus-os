export interface AIWorkerConfig {
  concurrency: number;
  maxRetries: number;
  timeout: number;
  providers: string[];
}

export interface AIJob {
  id: string;
  type: 'chat' | 'embedding' | 'classification' | 'extraction';
  provider?: string;
  model?: string;
  input: Record<string, unknown>;
  priority: number;
  createdAt: string;
}
