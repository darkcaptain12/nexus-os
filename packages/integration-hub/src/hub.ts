import type { ExecuteResult, IntegrationHubStats, ProviderCredentials, ProviderHealth } from './types';
import type { Provider } from './provider';
import { ProviderRegistry } from './registry';
import { CredentialManager } from './credentials';
import { ConnectionManager } from './connections';
import { RateLimiter } from './rate-limit';

export class IntegrationHub {
  readonly registry: ProviderRegistry;
  readonly credentials: CredentialManager;
  readonly connections: ConnectionManager;
  readonly rateLimiter: RateLimiter;

  private totalExecutions = 0;
  private failedExecutions = 0;
  private totalLatencyMs = 0;

  constructor() {
    this.registry = new ProviderRegistry();
    this.credentials = new CredentialManager();
    this.connections = new ConnectionManager();
    this.rateLimiter = new RateLimiter();
  }

  registerProvider(provider: Provider): void {
    this.registry.register(provider);
  }

  async connect(providerId: string, userId: string, creds: ProviderCredentials): Promise<void> {
    const provider = this.registry.get(providerId);
    if (!provider) throw new Error(`Provider not found: ${providerId}`);

    this.credentials.set(providerId, creds);
    await this.connections.connect(provider, userId, creds);
  }

  async disconnect(providerId: string): Promise<void> {
    await this.connections.disconnect(providerId);
    this.credentials.remove(providerId);
  }

  async execute(providerId: string, action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const provider = this.registry.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider not found: ${providerId}`, durationMs: 0, provider: providerId, action };
    }

    if (!provider.isConnected()) {
      return { success: false, error: 'Provider not connected', durationMs: 0, provider: providerId, action };
    }

    if (this.rateLimiter.isLimited(providerId)) {
      return { success: false, error: 'Rate limited', durationMs: 0, provider: providerId, action };
    }

    this.rateLimiter.consume(providerId);
    this.totalExecutions++;

    const result = await provider.execute(action, params);
    this.totalLatencyMs += result.durationMs;

    if (!result.success) {
      this.failedExecutions++;
    }

    return result;
  }

  async healthCheck(providerId: string): Promise<ProviderHealth> {
    return this.connections.checkHealth(providerId);
  }

  async healthCheckAll(): Promise<ProviderHealth[]> {
    return this.connections.checkAllHealth();
  }

  getStats(): IntegrationHubStats {
    return {
      totalProviders: this.registry.count(),
      connectedProviders: this.registry.listConnected().length,
      totalActions: this.registry.getAllActions().length,
      totalExecutions: this.totalExecutions,
      failedExecutions: this.failedExecutions,
      avgLatencyMs: this.totalExecutions > 0 ? Math.round(this.totalLatencyMs / this.totalExecutions) : 0,
    };
  }

  start(): void {
    this.connections.startHealthChecks();
  }

  stop(): void {
    this.connections.stopHealthChecks();
  }
}
