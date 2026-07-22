import type { GraphContextSelection } from './types';
import { getKnowledgeGraph } from './graph-store';
import { searchKnowledge } from './semantic-search';

// Context Builder v2 — Executive'e giden bağlam artık yalnız "son kayıtlar"
// değil: konuya göre graph'tan en ilgili node'lar seçilir (seed arama →
// 1-hop genişletme → derece+güncellik skoru).

const MAX_CONTEXT_NODES = 12;

export function selectGraphContext(topic: string): GraphContextSelection {
  const start = performance.now();
  const graph = getKnowledgeGraph();

  // Seed: hibrit arama
  const seeds = searchKnowledge({ keyword: topic, limit: 5 });

  const picked = new Map<string, number>(); // nodeId → skor
  for (const s of seeds.results) {
    picked.set(s.node.id, s.score + 1); // seed bonusu
  }

  // 1-hop genişletme: seed komşuları derece+ağırlıkla skorlanır
  for (const s of seeds.results) {
    const hood = graph.getNeighborhood(s.node.id, 1, 20);
    if (!hood) continue;
    for (const neighbor of hood.nodes) {
      const recencyBonus =
        Date.now() - new Date(neighbor.updatedAt).getTime() < 7 * 24 * 3600 * 1000 ? 0.3 : 0;
      const score = 0.4 + Math.min(0.4, graph.degree(neighbor.id) * 0.05) + recencyBonus;
      picked.set(neighbor.id, Math.max(picked.get(neighbor.id) ?? 0, score));
    }
  }

  const top = [...picked.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CONTEXT_NODES)
    .map(([id]) => graph.getNode(id)!)
    .filter(Boolean);

  const relations: string[] = [];
  const topIds = new Set(top.map((n) => n.id));
  for (const node of top) {
    for (const edge of graph.getEdgesOf(node.id)) {
      const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
      if (topIds.has(otherId) && edge.sourceId === node.id) {
        const other = graph.getNode(otherId);
        if (other) relations.push(`${node.name} --${edge.relation}--> ${other.name}`);
      }
    }
  }

  return {
    topic,
    nodes: top.map((n) => ({
      type: n.type,
      name: n.name,
      degree: graph.degree(n.id),
      summary: n.content?.slice(0, 120) ?? '',
    })),
    relations: [...new Set(relations)].slice(0, 20),
    selectedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - start),
  };
}
