// Knowledge Graph v2 — Relationship Intelligence tipleri (Sprint 15)

export type KnowledgeNodeType =
  | 'person'
  | 'company'
  | 'project'
  | 'task'
  | 'goal'
  | 'decision'
  | 'meeting'
  | 'note'
  | 'file'
  | 'website'
  | 'workflow'
  | 'agent'
  | 'trade'
  | 'strategy'
  | 'exchange';

export type RelationType =
  | 'related_to'
  | 'created_by'
  | 'belongs_to'
  | 'depends_on'
  | 'blocked_by'
  | 'generated_from'
  | 'references'
  | 'follows'
  | 'owns'
  | 'affects'
  | 'uses';

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  name: string;
  /** normalize edilmiş isim — duplicate tespiti için */
  normalizedName: string;
  content?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** aynı isim+tip tekrar geldiğinde artar — duplicate oranı ölçümü */
  mentionCount: number;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: RelationType;
  weight: number; // 0-1
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NodeWithDegree extends KnowledgeNode {
  degree: number;
}

export interface NeighborhoodResult {
  center: KnowledgeNode;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  depth: number;
}

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  typeDistribution: Record<KnowledgeNodeType, number>;
  relationDistribution: Record<RelationType, number>;
  mostConnected: { id: string; name: string; type: KnowledgeNodeType; degree: number }[];
  duplicateRatio: number; // mentionCount>1 node oranı — tekrar eden bilgi
  isolatedNodeCount: number;
  averageDegree: number;
  memoryHealth: number; // 0-100: bağlantılılık + izolasyon + duplicate karışımı
  generatedAt: string;
}

export interface KnowledgeSearchQuery {
  keyword?: string;
  types?: KnowledgeNodeType[];
  relations?: RelationType[];
  /** ISO tarih aralığı — timeline araması */
  dateFrom?: string;
  dateTo?: string;
  /** bu node'a komşu olanlarla sınırla */
  nearNodeId?: string;
  limit?: number;
}

export interface ScoredKnowledgeNode {
  node: KnowledgeNode;
  score: number;
  matchedOn: ('keyword' | 'entity' | 'relationship' | 'timeline')[];
}

export interface KnowledgeSearchResult {
  results: ScoredKnowledgeNode[];
  total: number;
  durationMs: number;
  query: KnowledgeSearchQuery;
}

export interface GraphContextSelection {
  topic: string;
  nodes: { type: KnowledgeNodeType; name: string; degree: number; summary: string }[];
  relations: string[];
  selectedAt: string;
  durationMs: number;
}
