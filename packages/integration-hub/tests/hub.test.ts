import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationHub } from '../src/hub';
import { HTTPProvider } from '../src/providers/http';
import { GitHubProvider } from '../src/providers/github';
import { GmailProvider } from '../src/providers/gmail';
import { GoogleCalendarProvider } from '../src/providers/calendar';
import { MCPProvider } from '../src/providers/mcp';

describe('IntegrationHub', () => {
  let hub: IntegrationHub;

  beforeEach(() => {
    hub = new IntegrationHub();
  });

  it('registers providers', () => {
    hub.registerProvider(new HTTPProvider());
    hub.registerProvider(new GitHubProvider());
    expect(hub.registry.count()).toBe(2);
  });

  it('lists all providers', () => {
    hub.registerProvider(new HTTPProvider());
    hub.registerProvider(new GitHubProvider());
    hub.registerProvider(new GmailProvider());
    hub.registerProvider(new GoogleCalendarProvider());
    hub.registerProvider(new MCPProvider());
    expect(hub.registry.list()).toHaveLength(5);
  });

  it('connects and disconnects provider', async () => {
    hub.registerProvider(new HTTPProvider());
    await hub.connect('http', 'user1', { providerId: 'http', authMethod: 'none' });

    const conn = hub.connections.getConnection('http');
    expect(conn?.state).toBe('connected');

    await hub.disconnect('http');
    expect(hub.connections.getState('http')).toBe('disconnected');
  });

  it('fails execute on unconnected provider', async () => {
    hub.registerProvider(new HTTPProvider());
    const result = await hub.execute('http', 'http.get', { url: 'https://example.com' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not connected');
  });

  it('fails execute on unknown provider', async () => {
    const result = await hub.execute('unknown', 'action', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('collects all actions from all providers', () => {
    hub.registerProvider(new HTTPProvider());
    hub.registerProvider(new GitHubProvider());
    const actions = hub.registry.getAllActions();
    expect(actions.length).toBeGreaterThan(0);
  });

  it('reports stats', () => {
    hub.registerProvider(new HTTPProvider());
    const stats = hub.getStats();
    expect(stats.totalProviders).toBe(1);
    expect(stats.connectedProviders).toBe(0);
  });

  it('start and stop lifecycle', () => {
    hub.start();
    hub.stop();
  });
});
