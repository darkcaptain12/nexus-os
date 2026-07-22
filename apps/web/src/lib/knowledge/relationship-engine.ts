import type { KnowledgeNode, KnowledgeEdge, RelationType, KnowledgeNodeType } from './types';
import { getKnowledgeGraph } from './graph-store';

// Relationship Engine — 11 ilişki tipinin semantiği ve doğrulaması.
// Her ilişki yönlüdür: source --relation--> target.

export const RELATION_SEMANTICS: Record<RelationType, { description: string; inverse?: string }> = {
  related_to: { description: 'Genel ilişki (yönsüz anlam)' },
  created_by: { description: 'source, target tarafından oluşturuldu', inverse: 'owns' },
  belongs_to: { description: 'source, target’a aittir' },
  depends_on: { description: 'source, target’a bağımlıdır' },
  blocked_by: { description: 'source, target tarafından bloklanıyor' },
  generated_from: { description: 'source, target’tan üretildi' },
  references: { description: 'source, target’a atıf yapar' },
  follows: { description: 'source, target’ı zaman/sıra olarak takip eder' },
  owns: { description: 'source, target’ın sahibidir', inverse: 'created_by' },
  affects: { description: 'source, target’ı etkiler' },
  uses: { description: 'source, target’ı kullanır' },
};

export const VALID_RELATIONS = Object.keys(RELATION_SEMANTICS) as RelationType[];

export function isValidRelation(relation: string): relation is RelationType {
  return (VALID_RELATIONS as string[]).includes(relation);
}

/**
 * İki node'u ilişkilendir — node'lar yoksa upsert edilir.
 * Tek giriş noktası: tüm entegrasyonlar bunun üzerinden bağlanır.
 */
export function link(
  source: {
    type: KnowledgeNodeType;
    name: string;
    content?: string;
    metadata?: Record<string, unknown>;
  },
  relation: RelationType,
  target: {
    type: KnowledgeNodeType;
    name: string;
    content?: string;
    metadata?: Record<string, unknown>;
  },
  weight = 0.7,
): { source: KnowledgeNode; target: KnowledgeNode; edge: KnowledgeEdge | null } {
  const graph = getKnowledgeGraph();
  const s = graph.upsertNode(source.type, source.name, source.content, source.metadata ?? {});
  const t = graph.upsertNode(target.type, target.name, target.content, target.metadata ?? {});
  const edge = graph.addEdge(s.id, t.id, relation, weight);
  return { source: s, target: t, edge };
}

/** Zincir bağla: a→b→c→d aynı relation ile. */
export function linkChain(
  items: { type: KnowledgeNodeType; name: string }[],
  relation: RelationType,
  weight = 0.7,
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  for (let i = 0; i < items.length - 1; i++) {
    const result = link(items[i]!, relation, items[i + 1]!, weight);
    if (result.edge) edges.push(result.edge);
  }
  return edges;
}

/** Node'un belirli ilişki tipindeki komşuları. */
export function getRelated(
  nodeId: string,
  relation?: RelationType,
  limit = 20,
): { node: KnowledgeNode; edge: KnowledgeEdge; direction: 'out' | 'in' }[] {
  const graph = getKnowledgeGraph();
  const out: { node: KnowledgeNode; edge: KnowledgeEdge; direction: 'out' | 'in' }[] = [];
  for (const edge of graph.getEdgesOf(nodeId)) {
    if (relation && edge.relation !== relation) continue;
    const otherId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
    const node = graph.getNode(otherId);
    if (node) {
      out.push({ node, edge, direction: edge.sourceId === nodeId ? 'out' : 'in' });
      if (out.length >= limit) break;
    }
  }
  return out;
}
