import { describe, it, expect, beforeAll } from 'vitest';
import { searchKnowledge, findSimilar } from '../src/lib/knowledge/semantic-search';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';
import { link } from '../src/lib/knowledge/relationship-engine';

// Not: global graph paylaşılır — benzersiz isimlerle çalışılır.
const P = `SRCH${Date.now()}`;

beforeAll(() => {
  const graph = getKnowledgeGraph();
  graph.upsertNode('decision', `${P} Bitcoin al kararı`, 'BTCUSDT long açılmasına karar verildi');
  graph.upsertNode('decision', `${P} Ethereum bekle kararı`, 'ETH için teyit bekleniyor');
  graph.upsertNode('task', `${P} Bitcoin raporu yaz`);
  link({ type: 'trade', name: `${P} BUY BTC trade` }, 'generated_from', {
    type: 'decision',
    name: `${P} Bitcoin al kararı`,
  });
});

describe('Semantic Search — hibrit', () => {
  it('keyword kanalı: isim eşleşmesi bulur', () => {
    const r = searchKnowledge({ keyword: `${P} bitcoin` });
    expect(r.results.length).toBeGreaterThanOrEqual(2);
    expect(r.results[0]!.matchedOn).toContain('keyword');
  });

  it('content eşleşmesi de bulunur', () => {
    const r = searchKnowledge({ keyword: 'BTCUSDT long açılmasına' });
    expect(r.results.some((x) => x.node.name === `${P} Bitcoin al kararı`)).toBe(true);
  });

  it('tip filtresi: yalnız decision döner', () => {
    const r = searchKnowledge({ keyword: P, types: ['decision'] });
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results.every((x) => x.node.type === 'decision')).toBe(true);
  });

  it('keyword + tip birlikte: entity kanalı bonusu', () => {
    const r = searchKnowledge({ keyword: `${P} bitcoin`, types: ['decision'] });
    const top = r.results[0]!;
    expect(top.node.type).toBe('decision');
    expect(top.matchedOn).toContain('entity');
  });

  it('timeline filtresi: gelecek tarihli aralık boş döner', () => {
    const r = searchKnowledge({
      keyword: `${P} bitcoin`,
      dateFrom: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
    expect(r.results).toHaveLength(0);
  });

  it('timeline filtresi: bugünü kapsayan aralık sonuç döner ve timeline kanalı işaretlenir', () => {
    const r = searchKnowledge({
      keyword: `${P} bitcoin`,
      dateFrom: new Date(Date.now() - 3600 * 1000).toISOString(),
    });
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results[0]!.matchedOn).toContain('timeline');
  });

  it('relations filtresi: generated_from ilişkisi olan node güçlenir', () => {
    const r = searchKnowledge({ keyword: P, relations: ['generated_from'] });
    const decision = r.results.find((x) => x.node.name === `${P} Bitcoin al kararı`);
    expect(decision).toBeDefined();
    expect(decision!.matchedOn).toContain('relationship');
  });

  it('sonuçlar skora göre sıralı, durationMs ölçülür', () => {
    const r = searchKnowledge({ keyword: P });
    for (let i = 1; i < r.results.length; i++) {
      expect(r.results[i - 1]!.score).toBeGreaterThanOrEqual(r.results[i]!.score);
    }
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('findSimilar', () => {
  it('aynı tip + ortak komşu benzerliği bulur', () => {
    const graph = getKnowledgeGraph();
    const hub = graph.upsertNode('project', `${P} Hub`);
    const s1 = graph.upsertNode('task', `${P} Görev Bir`);
    const s2 = graph.upsertNode('task', `${P} Görev İki`);
    graph.addEdge(s1.id, hub.id, 'belongs_to');
    graph.addEdge(s2.id, hub.id, 'belongs_to');
    const similar = findSimilar(s1.id, 5);
    expect(similar.some((x) => x.node.id === s2.id)).toBe(true);
  });

  it('olmayan node boş döner', () => {
    expect(findSimilar('nonexistent-id')).toHaveLength(0);
  });
});
