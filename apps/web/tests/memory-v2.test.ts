import { describe, it, expect } from 'vitest';
import { extractEntities } from '../src/lib/memory/entity-extractor';
import type {
  MemoryRecord,
  MemoryHealthReport,
  MemoryGraphNode,
  MemoryGraphEdge,
} from '../src/lib/repositories';

describe('Entity Extractor', () => {
  it('extracts technology entities', () => {
    const entities = extractEntities('We built the app with React and TypeScript using Supabase');
    const techNames = entities.filter((e) => e.type === 'technology').map((e) => e.name);
    expect(techNames).toContain('react');
    expect(techNames).toContain('typescript');
    expect(techNames).toContain('supabase');
  });

  it('extracts date entities', () => {
    const entities = extractEntities('Toplantı 2026-07-15 tarihinde yapılacak');
    expect(entities.some((e) => e.type === 'date')).toBe(true);
  });

  it('extracts capitalized names', () => {
    const entities = extractEntities('Emir Kaya projeyi yönetiyor');
    expect(entities.some((e) => e.type === 'person' && e.name === 'Emir Kaya')).toBe(true);
  });

  it('returns sorted by confidence', () => {
    const entities = extractEntities(
      'React ile çalışan Emir Kaya bugün 2026-01-01 toplantıya katıldı',
    );
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i - 1]!.confidence).toBeGreaterThanOrEqual(entities[i]!.confidence);
    }
  });

  it('handles empty content', () => {
    expect(extractEntities('')).toHaveLength(0);
  });

  it('deduplicates entities', () => {
    const entities = extractEntities('React React React');
    const reactEntities = entities.filter((e) => e.name === 'react');
    expect(reactEntities).toHaveLength(1);
  });
});

describe('MemoryHealthReport type', () => {
  it('has required fields', () => {
    const report: MemoryHealthReport = {
      totalMemories: 100,
      orphanMemories: 20,
      duplicateCandidates: 5,
      lowImportance: 10,
      missingType: 0,
      avgImportance: 0.65,
      typeDistribution: { note: 40, decision: 30, fact: 30 },
    };
    expect(report.totalMemories).toBe(100);
    expect(Object.keys(report.typeDistribution)).toHaveLength(3);
  });
});

describe('MemoryGraph types', () => {
  it('node has required fields', () => {
    const node: MemoryGraphNode = { id: '1', title: 'Test', type: 'note', importance: 0.7 };
    expect(node.importance).toBe(0.7);
  });

  it('edge has required fields', () => {
    const edge: MemoryGraphEdge = {
      source: '1',
      target: '2',
      relationship: 'related_to',
      strength: 0.8,
    };
    expect(edge.relationship).toBe('related_to');
  });
});

describe('MemoryRecord type', () => {
  it('has all fields including access_count', () => {
    const memory: MemoryRecord = {
      id: '1',
      type: 'note',
      content: 'Test',
      summary: null,
      source: 'user',
      owner_id: null,
      privacy: 'private',
      importance: 0.5,
      tags: ['test'],
      access_count: 3,
      metadata: {},
      created_at: '',
      updated_at: '',
      deleted_at: null,
    };
    expect(memory.access_count).toBe(3);
    expect(memory.tags).toContain('test');
  });
});
