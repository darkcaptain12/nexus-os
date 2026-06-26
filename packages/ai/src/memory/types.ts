export type AIMemoryType =
  | 'working'
  | 'short'
  | 'long'
  | 'semantic'
  | 'conversation'
  | 'knowledge'
  | 'project'
  | 'document'
  | 'relationship';

export type MemoryPrivacy = 'public' | 'private' | 'system';

export interface AIMemoryEntry {
  id: string;
  type: AIMemoryType;
  content: string;
  summary?: string;
  embeddingId?: string;
  importance: number;
  tags: string[];
  source: string;
  owner: string;
  privacy: MemoryPrivacy;
  ttl?: number;
  accessCount: number;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata: Record<string, unknown>;
}

export interface WorkingMemory {
  sessionId: string;
  entries: AIMemoryEntry[];
  tokenCount: number;
  maxTokens: number;
  createdAt: string;
}

export interface ConversationMemory {
  conversationId: string;
  turns: ConversationTurn[];
  summary?: string;
  participants: string[];
  startedAt: string;
  lastActivityAt: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: { name: string; result: string }[];
  timestamp: string;
  tokenCount: number;
}

export interface KnowledgeMemory {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'document' | 'conversation' | 'web' | 'user' | 'system';
  category: string;
  tags: string[];
  confidence: number;
  citations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipMemory {
  id: string;
  entityA: string;
  entityB: string;
  relationship: string;
  strength: number;
  context: string;
  evidence: string[];
  createdAt: string;
}

export interface MemorySearchOptions {
  type?: AIMemoryType;
  limit?: number;
  minScore?: number;
  minImportance?: number;
  tags?: string[];
  privacy?: MemoryPrivacy;
  timeRange?: { from: string; to: string };
}

export interface MemorySearchHit {
  entry: AIMemoryEntry;
  score: number;
  matchedOn: 'semantic' | 'keyword' | 'tag' | 'metadata';
}

export interface MemoryConsolidation {
  mergedEntries: string[];
  newEntry: AIMemoryEntry;
  reason: string;
  tokensSaved: number;
}
