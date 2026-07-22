import { describe, it, expect } from 'vitest';
import {
  link,
  linkChain,
  getRelated,
  isValidRelation,
  VALID_RELATIONS,
} from '../src/lib/knowledge/relationship-engine';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';

describe('Relationship Engine', () => {
  it('11 ilişki tipi tanımlı', () => {
    expect(VALID_RELATIONS).toHaveLength(11);
    expect(VALID_RELATIONS).toContain('depends_on');
    expect(VALID_RELATIONS).toContain('blocked_by');
    expect(VALID_RELATIONS).toContain('generated_from');
  });

  it('isValidRelation doğru ayırt eder', () => {
    expect(isValidRelation('owns')).toBe(true);
    expect(isValidRelation('likes')).toBe(false);
  });

  it('link node’ları upsert edip edge kurar', () => {
    const result = link({ type: 'trade', name: 'BUY 0.1 TESTCOIN' }, 'uses', {
      type: 'strategy',
      name: 'Test Strategy',
    });
    expect(result.source.type).toBe('trade');
    expect(result.target.type).toBe('strategy');
    expect(result.edge).not.toBeNull();
    expect(result.edge!.relation).toBe('uses');
  });

  it('linkChain a→b→c zinciri kurar', () => {
    const edges = linkChain(
      [
        { type: 'file', name: 'chain-a.ts' },
        { type: 'note', name: 'Chain IDE' },
        { type: 'project', name: 'Chain Project' },
      ],
      'related_to',
    );
    expect(edges).toHaveLength(2);
  });

  it('getRelated ilişki tipine göre filtreler', () => {
    const { source } = link({ type: 'agent', name: 'Rel Agent' }, 'owns', {
      type: 'task',
      name: 'Rel Task',
    });
    link({ type: 'agent', name: 'Rel Agent' }, 'references', { type: 'note', name: 'Rel Note' });
    const owned = getRelated(source.id, 'owns');
    expect(owned).toHaveLength(1);
    expect(owned[0]!.node.name).toBe('Rel Task');
    expect(owned[0]!.direction).toBe('out');
    const all = getRelated(source.id);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('graph singleton üzerinden çalışır', () => {
    const graph = getKnowledgeGraph();
    const before = graph.getStatistics().nodeCount;
    link({ type: 'note', name: `Singleton-${Date.now()}` }, 'related_to', {
      type: 'note',
      name: `Diğer-${Date.now()}`,
    });
    expect(graph.getStatistics().nodeCount).toBe(before + 2);
  });
});
