import type { ProviderMetadata, ProviderCredentials, ProviderAction, ProviderHealth, ExecuteResult } from './types';

export interface Provider {
  readonly metadata: ProviderMetadata;
  connect(credentials: ProviderCredentials): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<ProviderHealth>;
  execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult>;
  getActions(): ProviderAction[];
  isConnected(): boolean;
}

export abstract class BaseProvider implements Provider {
  abstract readonly metadata: ProviderMetadata;
  protected connected = false;
  protected credentials: ProviderCredentials | null = null;

  async connect(credentials: ProviderCredentials): Promise<void> {
    this.credentials = credentials;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
    this.connected = false;
  }

  async health(): Promise<ProviderHealth> {
    return {
      providerId: this.metadata.id,
      healthy: this.connected,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  abstract execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult>;
  abstract getActions(): ProviderAction[];

  isConnected(): boolean {
    return this.connected;
  }

  protected makeResult(action: string, start: number, data: unknown): ExecuteResult {
    return {
      success: true,
      data,
      durationMs: Math.round(performance.now() - start),
      provider: this.metadata.id,
      action,
    };
  }

  protected makeError(action: string, start: number, error: string): ExecuteResult {
    return {
      success: false,
      error,
      durationMs: Math.round(performance.now() - start),
      provider: this.metadata.id,
      action,
    };
  }
}
