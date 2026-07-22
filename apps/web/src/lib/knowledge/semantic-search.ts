import type {
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  ScoredKnowledgeNode,
  KnowledgeNode,
} from './types';
import { getKnowledgeGraph } from './graph-store';

// Semantic Search — tek sorguda hibrit: keyword + entity tipi + ilişki +
// timeline. Skorlar birleşir; bir node birden çok kanaldan eşleşirse güçlenir.

function keywordScore(node: KnowledgeNode, keyword: string): number {
  const kw = keyword.toLowerCase();
  const name = node.normalizedName;
  if (name === kw) return 1;
  if (name.includes(kw)) return 0.8;
  if (node.content?.toLowerCase().includes(kw)) return 0.6;
  // kelime bazlı kısmi eşleşme
  const kwWords = kw.split(/\s+/).filter((w) => w.length > 2);
  if (kwWords.length > 0) {
    const hits = kwWords.filter((w) => name.includes(w) || node.content?.toLowerCase().includes(w));
    if (hits.length > 0) return 0.3 + 0.3 * (hits.length / kwWords.length);
  }
  return 0;
}

export function searchKnowledge(query: KnowledgeSearchQuery): KnowledgeSearchResult {
  const start = performance.now();
  const graph = getKnowledgeGraph();
  const limit = query.limit ?? 20;
  const scored = new Map<string, ScoredKnowledgeNode>();

  const addScore = (
    node: KnowledgeNode,
    score: number,
    channel: ScoredKnowledgeNode['matchedOn'][number],
  ): void => {
    const existing = scored.get(node.id);
    if (existing) {
      existing.score += score * 0.5; // çoklu kanal eşleşmesi güçlendirir
      if (!existing.matchedOn.includes(channel)) existing.matchedOn.push(channel);
    } else {
      scored.set(node.id, { node, score, matchedOn: [channel] });
    }
  };

  // Aday küme: tip filtresi varsa o tipler, yoksa tüm node'lar (tek geçiş)
  const candidates: KnowledgeNode[] = query.types?.length
    ? query.types.flatMap((t) => graph.getNodesByType(t, 500))
    : graph.getAllNodes(2000);

  for (const node of candidates) {
    // keyword kanalı
    if (query.keyword) {
      const s = keywordScore(node, query.keyword);
      if (s > 0) addScore(node, s, 'keyword');
    } else if (query.types?.length) {
      addScore(node, 0.4, 'entity');
    }

    // timeline kanalı
    if (query.dateFrom || query.dateTo) {
      const inRange =
        (!query.dateFrom || node.updatedAt >= query.dateFrom) &&
        (!query.dateTo || node.updatedAt <= query.dateTo);
      if (inRange) {
        addScore(node, 0.5, 'timeline');
      } else if (scored.has(node.id)) {
        scored.delete(node.id); // aralık dışı — timeline filtresi katı
      }
    }
  }

  // entity tipi kanalı: tip eşleşen keyword sonuçlarına bonus
  if (query.types?.length && query.keyword) {
    for (const item of scored.values()) {
      if (query.types.includes(item.node.type)) {
        item.score += 0.3;
        if (!item.matchedOn.includes('entity')) item.matchedOn.push('entity');
      }
    }
  }

  // ilişki kanalı: nearNodeId komşuluğu veya relation filtresi
  if (query.nearNodeId) {
    const hood = graph.getNeighborhood(query.nearNodeId, 2, 100);
    if (hood) {
      const neighborIds = new Set(hood.nodes.map((n) => n.id));
      for (const node of hood.nodes) {
        addScore(node, 0.4, 'relationship');
      }
      // komşuluk dışındakileri zayıflat
      for (const item of scored.values()) {
        if (!neighborIds.has(item.node.id) && item.node.id !== query.nearNodeId) {
          item.score *= 0.5;
        }
      }
    }
  }
  if (query.relations?.length) {
    for (const item of [...scored.values()]) {
      const edges = graph.getEdgesOf(item.node.id);
      const hasRelation = edges.some((e) => query.relations!.includes(e.relation));
      if (hasRelation) {
        item.score += 0.3;
        if (!item.matchedOn.includes('relationship')) item.matchedOn.push('relationship');
      }
    }
  }

  // bağlantılılık bonusu: yüksek dereceli node'lar hafif öne çıkar
  for (const item of scored.values()) {
    item.score += Math.min(0.2, graph.degree(item.node.id) * 0.02);
  }

  const results = [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit);

  return {
    results,
    total: scored.size,
    durationMs: Math.round(performance.now() - start),
    query,
  };
}

/** Benzer node'lar: aynı tip + ortak komşular + isim benzerliği. */
export function findSimilar(nodeId: string, limit = 10): ScoredKnowledgeNode[] {
  const graph = getKnowledgeGraph();
  const node = graph.getNode(nodeId);
  if (!node) return [];

  const myNeighbors = new Set(
    graph.getEdgesOf(nodeId).map((e) => (e.sourceId === nodeId ? e.targetId : e.sourceId)),
  );

  const scored: ScoredKnowledgeNode[] = [];
  for (const candidate of graph.getNodesByType(node.type, 500)) {
    if (candidate.id === nodeId) continue;
    let score = 0.2; // aynı tip taban puanı
    const theirNeighbors = graph
      .getEdgesOf(candidate.id)
      .map((e) => (e.sourceId === candidate.id ? e.targetId : e.sourceId));
    const shared = theirNeighbors.filter((id) => myNeighbors.has(id)).length;
    score += Math.min(0.5, shared * 0.15);
    // isim kelime kesişimi
    const myWords = new Set(node.normalizedName.split(' '));
    const overlap = candidate.normalizedName.split(' ').filter((w) => myWords.has(w)).length;
    score += Math.min(0.3, overlap * 0.15);
    if (score > 0.25) {
      scored.push({
        node: candidate,
        score: Number(score.toFixed(3)),
        matchedOn: ['relationship'],
      });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
