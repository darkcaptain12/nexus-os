import { describe, it, expect } from 'vitest';
import { installPlugin, enablePlugin } from '../src/lib/plugins/plugin-lifecycle';
import { removePlugin } from '../src/lib/plugins/plugin-registry';
import { subscribeHook, emitHook, getHookStats } from '../src/lib/plugins/event-hooks';
import {
  devDashboard,
  devMobileView,
  devMarketplace,
} from '../src/lib/plugins/services/developer-platform-service';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';

describe('Event Hooks — plugin dinleme', () => {
  it('enabled plugin hook alır, emit tetikler', () => {
    const id = `hook-${Date.now()}`;
    removePlugin(id);
    installPlugin({
      id,
      name: id,
      version: '1.0.0',
      author: 'T',
      permissions: [],
      actions: [],
      hooks: ['task.created'],
      settings: {},
      icon: '🔌',
      category: 'other',
    });
    enablePlugin(id);

    let received = false;
    subscribeHook(id, 'task.created', () => {
      received = true;
    });
    emitHook('task.created', { taskId: '1' });
    expect(received).toBe(true);
  });

  it("manifest'te olmayan hook iletilmez", () => {
    const id = `hook2-${Date.now()}`;
    removePlugin(id);
    installPlugin({
      id,
      name: id,
      version: '1.0.0',
      author: 'T',
      permissions: [],
      actions: [],
      hooks: ['task.created'],
      settings: {},
      icon: '🔌',
      category: 'other',
    });
    enablePlugin(id);

    let received = false;
    subscribeHook(id, 'trade.opened', () => {
      received = true;
    });
    emitHook('trade.opened', {}); // manifest'te trade.opened yok
    expect(received).toBe(false);
  });

  it('disabled plugin hook almaz', () => {
    const id = `hook3-${Date.now()}`;
    removePlugin(id);
    installPlugin({
      id,
      name: id,
      version: '1.0.0',
      author: 'T',
      permissions: [],
      actions: [],
      hooks: ['voice.intent'],
      settings: {},
      icon: '🔌',
      category: 'other',
    });
    // enable etme — installed durumda

    let received = false;
    subscribeHook(id, 'voice.intent', () => {
      received = true;
    });
    emitHook('voice.intent', {});
    expect(received).toBe(false);
  });

  it('hook stats event rate döner', () => {
    emitHook('desktop.activity', {});
    const stats = getHookStats();
    expect(stats.totalEmitted).toBeGreaterThan(0);
    expect(typeof stats.eventRate).toBe('number');
  });
});

describe('Trade journal → event hook wiring (Sprint 20 reuse)', () => {
  it('journalOpen trade.opened emit eder → plugin alır', async () => {
    const id = `journal-hook-${Date.now()}`;
    removePlugin(id);
    installPlugin({
      id,
      name: id,
      version: '1.0.0',
      author: 'T',
      permissions: [],
      actions: [],
      hooks: ['trade.opened'],
      settings: {},
      icon: '📈',
      category: 'other',
    });
    enablePlugin(id);

    let hookPayload: Record<string, unknown> | null = null;
    subscribeHook(id, 'trade.opened', (_e, p) => {
      hookPayload = p;
    });

    const { journalOpen } = await import('../src/lib/quant/live/trade-journal');
    journalOpen({
      symbol: 'BTCUSDT',
      direction: 'long',
      entryPrice: 60000,
      quantity: 0.01,
      reason: 'test',
      aiRationale: 'x',
      riskScore: 40,
      exchange: 'okx',
    });

    expect(hookPayload).not.toBeNull();
    expect((hookPayload as unknown as { symbol: string }).symbol).toBe('BTCUSDT');
  });
});

describe('Developer Platform Service — facade', () => {
  it('devDashboard tüm alanları döner', () => {
    const d = devDashboard();
    expect(d).toHaveProperty('totalPlugins');
    expect(d).toHaveProperty('enabledPlugins');
    expect(d).toHaveProperty('apiUsageTotal');
    expect(d).toHaveProperty('eventRate');
    expect(d).toHaveProperty('marketplaceCount');
    expect(d.marketplaceCount).toBe(12);
  });

  it('devMobileView mobil plugin listesi (düz JSON)', () => {
    const v = devMobileView();
    expect(v).toHaveProperty('installed');
    expect(v).toHaveProperty('marketplaceCount');
    expect(() => JSON.stringify(v)).not.toThrow();
  });

  it('devMarketplace listeler', () => {
    expect(devMarketplace().length).toBe(12);
  });
});

describe('Knowledge Graph — plugin ilişkileri', () => {
  it("plugin kurulumu KG'ye yazılır", () => {
    const id = `kg-plugin-${Date.now()}`;
    removePlugin(id);
    const graph = getKnowledgeGraph();
    const before = graph.getStatistics().nodeCount;
    installPlugin({
      id,
      name: `KG Plugin ${id}`,
      version: '1.0.0',
      author: 'T',
      permissions: [],
      actions: ['sync.data'],
      hooks: [],
      settings: {},
      icon: '🔌',
      category: 'developer',
    });
    expect(graph.getStatistics().nodeCount).toBeGreaterThan(before);
  });
});
