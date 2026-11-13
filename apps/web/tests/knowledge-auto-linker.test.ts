import { describe, it, expect } from 'vitest';
import {
  ingestText,
  recordAgentCreated,
  recordTrade,
  recordMarketAnalysis,
  recordDesktopActivity,
} from '../src/lib/knowledge/auto-linker';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';

describe('Auto Linker', () => {
  it('ingestText borsa ismini exchange node olarak bağlar', () => {
    const { source, linked } = ingestText(
      'note',
      'Binance Notu',
      'Binance üzerinde BTC analizi yaptım, Supabase kayıt edildi',
    );
    expect(source.type).toBe('note');
    const graph = getKnowledgeGraph();
    const exchange = graph.findNode('exchange', 'binance');
    expect(exchange).not.toBeNull();
    expect(linked.length).toBeGreaterThan(0);
  });

  it('ingestText kripto sembolünü references ile bağlar', () => {
    ingestText('decision', 'BTC Kararı', 'BTCUSDT long pozisyon değerlendirildi');
    const graph = getKnowledgeGraph();
    expect(graph.findNode('note', 'BTCUSDT')).not.toBeNull();
  });

  it('recordAgentCreated agent→goal owns ilişkisi kurar', () => {
    recordAgentCreated('agent-1', 'Linker Test Ajanı', 'Bildirim gönder ve raporla');
    const graph = getKnowledgeGraph();
    const agent = graph.findNode('agent', 'Linker Test Ajanı');
    expect(agent).not.toBeNull();
    const edges = graph.getEdgesOf(agent!.id);
    expect(edges.some((e) => e.relation === 'owns')).toBe(true);
  });

  it('recordTrade tam zinciri kurar: strategy, decision, portfolio, market, exchange', () => {
    recordTrade({
      symbol: 'ETHUSDT',
      side: 'buy',
      quantity: 0.5,
      price: 3000,
      exchange: 'okx',
      strategy: 'ema-cross',
    });
    const graph = getKnowledgeGraph();
    const trade = graph.findNode('trade', 'BUY 0.5 ETHUSDT @ 3000');
    expect(trade).not.toBeNull();
    const relations = graph
      .getEdgesOf(trade!.id)
      .map((e) => e.relation)
      .sort();
    expect(relations).toContain('uses'); // strategy + exchange
    expect(relations).toContain('generated_from'); // decision
    expect(relations).toContain('affects'); // risk profili
    expect(relations).toContain('belongs_to'); // portfolio
    expect(relations).toContain('references'); // market sembolü
    expect(graph.degree(trade!.id)).toBeGreaterThanOrEqual(6);
  });

  it('recordMarketAnalysis decision→sembol/exchange bağlar', () => {
    recordMarketAnalysis('SOLUSDT', 'okx', 'Trend up güç 70, RSI 58');
    const graph = getKnowledgeGraph();
    const today = new Date().toISOString().slice(0, 10);
    const decision = graph.findNode('decision', `Analiz: SOLUSDT (${today})`);
    expect(decision).not.toBeNull();
    expect(decision!.content).toContain('Trend up');
  });

  it('recordDesktopActivity file→app→project zinciri kurar', () => {
    recordDesktopActivity({
      app: 'VS Code',
      windowTitle: 'graph-store.ts — APEX-OS',
      filePath: '/Users/emir/Projects/APEX-OS/graph-store.ts',
      projectHint: 'APEX OS Desktop',
    });
    const graph = getKnowledgeGraph();
    expect(graph.findNode('file', 'graph-store.ts')).not.toBeNull();
    expect(graph.findNode('project', 'APEX OS Desktop')).not.toBeNull();
  });

  it('recordDesktopActivity url → website hostname node', () => {
    recordDesktopActivity({ app: 'Safari', url: 'https://docs.okx.com/api/v5' });
    const graph = getKnowledgeGraph();
    expect(graph.findNode('website', 'docs.okx.com')).not.toBeNull();
  });
});
