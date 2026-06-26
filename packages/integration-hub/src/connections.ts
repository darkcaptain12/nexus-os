import type { Connection, ConnectionState, ProviderHealth } from './types';
import type { Provider } from './provider';

export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private providers = new Map<string, Provider>();

  async connect(provider: Provider, userId: string, credentials: import('./types').ProviderCredentials): Promise<Connection> {
    const conn: Connection = {
      id: crypto.randomUUID(),
      providerId: provider.metadata.id,
      state: 'connecting',
      userId,
      metadata: {},
    };
    this.connections.set(provider.metadata.id, conn);
    this.providers.set(provider.metadata.id, provider);

    try {
      await provider.connect(credentials);
      conn.state = 'connected';
      conn.connectedAt = new Date().toISOString();
    } catch (err) {
      conn.state = 'error';
      conn.error = err instanceof Error ? err.message : String(err);
    }

    return conn;
  }

  async disconnect(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.disconnect();
    }
    const conn = this.connections.get(providerId);
    if (conn) {
      conn.state = 'disconnected';
    }
    this.providers.delete(providerId);
  }

  getConnection(providerId: string): Connection | undefined {
    return this.connections.get(providerId);
  }

  listConnections(): Connection[] {
    return [...this.connections.values()];
  }

  getState(providerId: string): ConnectionState {
    return this.connections.get(providerId)?.state ?? 'disconnected';
  }

  async checkHealth(providerId: string): Promise<ProviderHealth> {
    const provider = this.providers.get(providerId);
    const conn = this.connections.get(providerId);

    if (!provider || !conn) {
      return { providerId, healthy: false, latencyMs: 0, error: 'Not connected', checkedAt: new Date().toISOString() };
    }

    const health = await provider.health();
    conn.lastHealthCheck = health.checkedAt;
    conn.healthLatencyMs = health.latencyMs;

    if (!health.healthy) {
      conn.state = 'error';
      conn.error = health.error;
    }

    return health;
  }

  async checkAllHealth(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    for (const providerId of this.providers.keys()) {
      results.push(await this.checkHealth(providerId));
    }
    return results;
  }

  startHealthChecks(intervalMs = 300000): void {
    if (this.healthInterval) return;
    this.healthInterval = setInterval(() => {
      this.checkAllHealth().catch(() => {});
    }, intervalMs);
  }

  stopHealthChecks(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }
}
