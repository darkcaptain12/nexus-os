import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraphStore, normalizeName } from '../src/lib/knowledge/graph-store';

describe('KnowledgeGraphStore', () => {
  let store: KnowledgeGraphStore;

  beforeEach(() => {
    store = new KnowledgeGraphStore();
  });

  it('upsertNode yeni node oluşturur', () => {
    const node = store.upsertNode('project', 'APEX OS');
    expect(node.id).toBeTruthy();
    expect(node.type).toBe('project');
    expect(node.mentionCount).toBe(1);
  });

  it('aynı tip+isim ikinci kez upsert → mentionCount artar, duplicate node oluşmaz', () => {
    const first = store.upsertNode('project', 'APEX OS');
    const second = store.upsertNode('project', 'apex os'); // case-insensitive
    expect(second.id).toBe(first.id);
    expect(second.mentionCount).toBe(2);
    expect(store.getStatistics().nodeCount).toBe(1);
  });

  it('normalizeName boşluk ve case normalize eder', () => {
    expect(normalizeName('  APEX   OS ')).toBe('apex os');
  });

  it('findNode tip+isimle bulur', () => {
    store.upsertNode('agent', 'Trading Ajanı');
    expect(store.findNode('agent', 'trading ajanı')).not.toBeNull();
    expect(store.findNode('task', 'Trading Ajanı')).toBeNull();
  });

  it('addEdge ilişki kurar; aynı üçlü tekrar → weight güçlenir, edge sayısı sabit', () => {
    const a = store.upsertNode('agent', 'A');
    const b = store.upsertNode('goal', 'B');
    const e1 = store.addEdge(a.id, b.id, 'owns', 0.7);
    const e2 = store.addEdge(a.id, b.id, 'owns');
    expect(e1!.id).toBe(e2!.id);
    expect(e2!.weight).toBeCloseTo(0.8, 5);
    expect(store.getStatistics().edgeCount).toBe(1);
  });

  it('self-edge reddedilir', () => {
    const a = store.upsertNode('note', 'X');
    expect(store.addEdge(a.id, a.id, 'related_to')).toBeNull();
  });

  it('olmayan node edge reddedilir', () => {
    const a = store.upsertNode('note', 'X');
    expect(store.addEdge(a.id, 'yok-boyle-id', 'related_to')).toBeNull();
  });

  it('degree adjacency üzerinden doğru sayar', () => {
    const a = store.upsertNode('agent', 'A');
    const b = store.upsertNode('task', 'B');
    const c = store.upsertNode('goal', 'C');
    store.addEdge(a.id, b.id, 'owns');
    store.addEdge(a.id, c.id, 'owns');
    expect(store.degree(a.id)).toBe(2);
    expect(store.degree(b.id)).toBe(1);
  });

  it('getNeighborhood BFS depth 1 yalnız doğrudan komşular', () => {
    const a = store.upsertNode('agent', 'A');
    const b = store.upsertNode('task', 'B');
    const c = store.upsertNode('goal', 'C');
    store.addEdge(a.id, b.id, 'owns');
    store.addEdge(b.id, c.id, 'belongs_to');
    const hood = store.getNeighborhood(a.id, 1);
    expect(hood!.nodes.map((n) => n.name)).toEqual(['B']);
  });

  it('getNeighborhood depth 2 iki adım uzağı bulur', () => {
    const a = store.upsertNode('agent', 'A');
    const b = store.upsertNode('task', 'B');
    const c = store.upsertNode('goal', 'C');
    store.addEdge(a.id, b.id, 'owns');
    store.addEdge(b.id, c.id, 'belongs_to');
    const hood = store.getNeighborhood(a.id, 2);
    expect(hood!.nodes.map((n) => n.name).sort()).toEqual(['B', 'C']);
    expect(hood!.edges).toHaveLength(2);
  });

  it('getNeighborhood maxNodes limiti uygular (lazy)', () => {
    const center = store.upsertNode('project', 'Merkez');
    for (let i = 0; i < 20; i++) {
      const n = store.upsertNode('note', `N${i}`);
      store.addEdge(center.id, n.id, 'references');
    }
    const hood = store.getNeighborhood(center.id, 1, 5);
    expect(hood!.nodes.length).toBeLessThanOrEqual(5);
  });

  it('getMostConnected dereceye göre sıralar', () => {
    const hub = store.upsertNode('project', 'Hub');
    const solo = store.upsertNode('note', 'Solo');
    for (let i = 0; i < 3; i++) {
      const n = store.upsertNode('task', `T${i}`);
      store.addEdge(hub.id, n.id, 'owns');
    }
    const top = store.getMostConnected(2);
    expect(top[0]!.name).toBe('Hub');
    expect(top[0]!.degree).toBe(3);
    void solo;
  });

  it('getStatistics dağılımları ve health döner', () => {
    store.upsertNode('project', 'P');
    store.upsertNode('project', 'P'); // duplicate mention
    const a = store.upsertNode('agent', 'A');
    const t = store.upsertNode('task', 'T');
    store.addEdge(a.id, t.id, 'owns');
    const s = store.getStatistics();
    expect(s.nodeCount).toBe(3);
    expect(s.edgeCount).toBe(1);
    expect(s.typeDistribution.project).toBe(1);
    expect(s.relationDistribution.owns).toBe(1);
    expect(s.duplicateRatio).toBeGreaterThan(0);
    expect(s.isolatedNodeCount).toBe(1); // P izole
    expect(s.memoryHealth).toBeGreaterThanOrEqual(0);
    expect(s.memoryHealth).toBeLessThanOrEqual(100);
  });

  it('getRecentEdges en yeni ilişkiyi önce döner', () => {
    const a = store.upsertNode('note', 'A');
    const b = store.upsertNode('note', 'B');
    const c = store.upsertNode('note', 'C');
    store.addEdge(a.id, b.id, 'related_to');
    store.addEdge(b.id, c.id, 'follows');
    const recent = store.getRecentEdges(2);
    expect(recent[0]!.edge.relation).toBe('follows');
  });
});
