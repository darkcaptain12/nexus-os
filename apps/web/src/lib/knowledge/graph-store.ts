import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeNodeType,
  RelationType,
  NeighborhoodResult,
  GraphStatistics,
  NodeWithDegree,
} from './types';
import { persistKnowledgeNode, persistKnowledgeEdge } from './knowledge-repository';
import { deferPersist } from '@/lib/persist-after';

// Knowledge Graph Store — in-memory, adjacency list'li + Supabase write-through
// (Faz 2 kalıcılık): upsertNode/addEdge sync kalır, arka planda kalıcı yazılır.
// Traversal O(V+E): her node'un edge id seti tutulur, komşuluk sorgusu
// tüm edge listesini taramaz (N+1 yok). Dönüşler limit'li (lazy loading).

const MAX_NODES = 5000;
const MAX_EDGES = 20000;

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class KnowledgeGraphStore {
  private nodes = new Map<string, KnowledgeNode>();
  private edges = new Map<string, KnowledgeEdge>();
  /** nodeId → o node'a değen edge id'leri */
  private adjacency = new Map<string, Set<string>>();
  /** `${type}:${normalizedName}` → nodeId — upsert/duplicate tespiti */
  private nameIndex = new Map<string, string>();
  /** `${sourceId}|${relation}|${targetId}` → edgeId — edge dedupe */
  private edgeIndex = new Map<string, string>();
  private insertOrder: string[] = [];
  private edgeOrder: string[] = [];

  /** Aynı tip+isim varsa mevcut node'u günceller (mentionCount++), yoksa oluşturur. */
  upsertNode(
    type: KnowledgeNodeType,
    name: string,
    content?: string,
    metadata: Record<string, unknown> = {},
  ): KnowledgeNode {
    const normalized = normalizeName(name);
    const key = `${type}:${normalized}`;
    const existingId = this.nameIndex.get(key);

    if (existingId) {
      const node = this.nodes.get(existingId)!;
      node.mentionCount += 1;
      node.updatedAt = new Date().toISOString();
      if (content) node.content = content;
      Object.assign(node.metadata, metadata);
      deferPersist(() => persistKnowledgeNode(node)); // write-through
      return node;
    }

    const now = new Date().toISOString();
    const node: KnowledgeNode = {
      id: crypto.randomUUID(),
      type,
      name: name.trim(),
      normalizedName: normalized,
      content,
      metadata,
      createdAt: now,
      updatedAt: now,
      mentionCount: 1,
    };
    this.nodes.set(node.id, node);
    this.nameIndex.set(key, node.id);
    this.adjacency.set(node.id, new Set());
    this.insertOrder.push(node.id);

    if (this.insertOrder.length > MAX_NODES) {
      const evicted = this.insertOrder.shift()!;
      this.removeNode(evicted);
    }
    deferPersist(() => persistKnowledgeNode(node)); // write-through
    return node;
  }

  getNode(id: string): KnowledgeNode | null {
    return this.nodes.get(id) ?? null;
  }

  findNode(type: KnowledgeNodeType, name: string): KnowledgeNode | null {
    const id = this.nameIndex.get(`${type}:${normalizeName(name)}`);
    return id ? (this.nodes.get(id) ?? null) : null;
  }

  /** Aynı source+relation+target tekrar gelirse weight güçlenir, duplicate edge oluşmaz. */
  addEdge(
    sourceId: string,
    targetId: string,
    relation: RelationType,
    weight = 0.7,
    metadata: Record<string, unknown> = {},
  ): KnowledgeEdge | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;
    if (sourceId === targetId) return null;

    const key = `${sourceId}|${relation}|${targetId}`;
    const existingId = this.edgeIndex.get(key);
    if (existingId) {
      const edge = this.edges.get(existingId)!;
      edge.weight = Math.min(1, edge.weight + 0.1);
      deferPersist(() => persistKnowledgeEdge(edge)); // write-through
      return edge;
    }

    const edge: KnowledgeEdge = {
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      relation,
      weight,
      createdAt: new Date().toISOString(),
      metadata,
    };
    this.edges.set(edge.id, edge);
    this.edgeIndex.set(key, edge.id);
    this.adjacency.get(sourceId)!.add(edge.id);
    this.adjacency.get(targetId)!.add(edge.id);
    this.edgeOrder.push(edge.id);

    if (this.edgeOrder.length > MAX_EDGES) {
      const evicted = this.edgeOrder.shift()!;
      this.removeEdge(evicted);
    }
    deferPersist(() => persistKnowledgeEdge(edge)); // write-through
    return edge;
  }

  private removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) return;
    this.adjacency.get(edge.sourceId)?.delete(edgeId);
    this.adjacency.get(edge.targetId)?.delete(edgeId);
    this.edgeIndex.delete(`${edge.sourceId}|${edge.relation}|${edge.targetId}`);
    this.edges.delete(edgeId);
  }

  private removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    const edgeIds = [...(this.adjacency.get(nodeId) ?? [])];
    for (const eid of edgeIds) this.removeEdge(eid);
    this.adjacency.delete(nodeId);
    this.nameIndex.delete(`${node.type}:${node.normalizedName}`);
    this.nodes.delete(nodeId);
  }

  /** Node'un doğrudan edge'leri — adjacency üzerinden O(degree). */
  getEdgesOf(nodeId: string): KnowledgeEdge[] {
    const ids = this.adjacency.get(nodeId);
    if (!ids) return [];
    return [...ids].map((id) => this.edges.get(id)!).filter(Boolean);
  }

  degree(nodeId: string): number {
    return this.adjacency.get(nodeId)?.size ?? 0;
  }

  /** BFS komşuluk — depth sınırlı, node limit'li (lazy). */
  getNeighborhood(nodeId: string, depth = 1, maxNodes = 50): NeighborhoodResult | null {
    const center = this.nodes.get(nodeId);
    if (!center) return null;

    const visited = new Set<string>([nodeId]);
    const resultEdges = new Map<string, KnowledgeEdge>();
    let frontier = [nodeId];

    for (let d = 0; d < depth && frontier.length > 0 && visited.size < maxNodes; d++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const edge of this.getEdgesOf(id)) {
          resultEdges.set(edge.id, edge);
          const other = edge.sourceId === id ? edge.targetId : edge.sourceId;
          if (!visited.has(other) && visited.size < maxNodes) {
            visited.add(other);
            next.push(other);
          }
        }
      }
      frontier = next;
    }

    visited.delete(nodeId);
    return {
      center,
      nodes: [...visited].map((id) => this.nodes.get(id)!).filter(Boolean),
      edges: [...resultEdges.values()],
      depth,
    };
  }

  getAllNodes(limit = 100, offset = 0): KnowledgeNode[] {
    return this.insertOrder
      .slice()
      .reverse()
      .slice(offset, offset + limit)
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  getAllEdges(limit = 200, offset = 0): KnowledgeEdge[] {
    return this.edgeOrder
      .slice()
      .reverse()
      .slice(offset, offset + limit)
      .map((id) => this.edges.get(id)!)
      .filter(Boolean);
  }

  getNodesByType(type: KnowledgeNodeType, limit = 50): KnowledgeNode[] {
    const out: KnowledgeNode[] = [];
    for (let i = this.insertOrder.length - 1; i >= 0 && out.length < limit; i--) {
      const node = this.nodes.get(this.insertOrder[i]!);
      if (node?.type === type) out.push(node);
    }
    return out;
  }

  getMostConnected(limit = 10): NodeWithDegree[] {
    const scored: NodeWithDegree[] = [];
    for (const [id, node] of this.nodes) {
      scored.push({ ...node, degree: this.degree(id) });
    }
    return scored.sort((a, b) => b.degree - a.degree).slice(0, limit);
  }

  /** Son eklenen ilişkiler — dashboard "son ilişkiler" ve timeline graph için. */
  getRecentEdges(
    limit = 20,
  ): { edge: KnowledgeEdge; source: KnowledgeNode; target: KnowledgeNode }[] {
    const out: { edge: KnowledgeEdge; source: KnowledgeNode; target: KnowledgeNode }[] = [];
    for (let i = this.edgeOrder.length - 1; i >= 0 && out.length < limit; i--) {
      const edge = this.edges.get(this.edgeOrder[i]!);
      if (!edge) continue;
      const source = this.nodes.get(edge.sourceId);
      const target = this.nodes.get(edge.targetId);
      if (source && target) out.push({ edge, source, target });
    }
    return out;
  }

  getStatistics(): GraphStatistics {
    const typeDistribution = {} as Record<KnowledgeNodeType, number>;
    const relationDistribution = {} as Record<RelationType, number>;
    let duplicates = 0;
    let isolated = 0;
    let totalDegree = 0;

    for (const [id, node] of this.nodes) {
      typeDistribution[node.type] = (typeDistribution[node.type] ?? 0) + 1;
      if (node.mentionCount > 1) duplicates++;
      const deg = this.degree(id);
      totalDegree += deg;
      if (deg === 0) isolated++;
    }
    for (const edge of this.edges.values()) {
      relationDistribution[edge.relation] = (relationDistribution[edge.relation] ?? 0) + 1;
    }

    const nodeCount = this.nodes.size;
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
    const isolatedRatio = nodeCount > 0 ? isolated / nodeCount : 0;
    const duplicateRatio = nodeCount > 0 ? duplicates / nodeCount : 0;
    // Health: bağlantılılık yüksek + izolasyon düşük iyi; duplicate = zengin tekrar sinyali, hafif ceza
    const memoryHealth = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          50 + Math.min(30, averageDegree * 10) - isolatedRatio * 40 - duplicateRatio * 10,
        ),
      ),
    );

    return {
      nodeCount,
      edgeCount: this.edges.size,
      typeDistribution,
      relationDistribution,
      mostConnected: this.getMostConnected(5).map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        degree: n.degree,
      })),
      duplicateRatio: Number(duplicateRatio.toFixed(3)),
      isolatedNodeCount: isolated,
      averageDegree: Number(averageDegree.toFixed(2)),
      memoryHealth,
      generatedAt: new Date().toISOString(),
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.nameIndex.clear();
    this.edgeIndex.clear();
    this.insertOrder = [];
    this.edgeOrder = [];
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexKnowledgeGraph?: KnowledgeGraphStore };

export function getKnowledgeGraph(): KnowledgeGraphStore {
  if (!g.__apexKnowledgeGraph) g.__apexKnowledgeGraph = new KnowledgeGraphStore();
  return g.__apexKnowledgeGraph;
}
