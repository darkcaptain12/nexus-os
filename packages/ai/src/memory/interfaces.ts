import type {
  AIMemoryEntry,
  AIMemoryType,
  WorkingMemory,
  ConversationMemory,
  MemorySearchOptions,
  MemorySearchHit,
  MemoryConsolidation,
} from './types';

export interface AIMemoryStore {
  store(entry: Omit<AIMemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Promise<AIMemoryEntry>;
  retrieve(id: string): Promise<AIMemoryEntry | null>;
  search(query: string, options?: MemorySearchOptions): Promise<MemorySearchHit[]>;
  update(id: string, updates: Partial<AIMemoryEntry>): Promise<AIMemoryEntry>;
  delete(id: string): Promise<void>;
  clear(type?: AIMemoryType): Promise<number>;
  consolidate(entryIds: string[]): Promise<MemoryConsolidation>;
}

export interface WorkingMemoryManager {
  create(sessionId: string, maxTokens: number): Promise<WorkingMemory>;
  get(sessionId: string): Promise<WorkingMemory | null>;
  add(sessionId: string, entry: AIMemoryEntry): Promise<void>;
  evict(sessionId: string, count: number): Promise<AIMemoryEntry[]>;
  clear(sessionId: string): Promise<void>;
}

export interface ConversationMemoryManager {
  create(conversationId: string): Promise<ConversationMemory>;
  addTurn(conversationId: string, turn: Omit<import('./types').ConversationTurn, 'timestamp' | 'tokenCount'>): Promise<void>;
  get(conversationId: string): Promise<ConversationMemory | null>;
  summarize(conversationId: string): Promise<string>;
  getRecentTurns(conversationId: string, count: number): Promise<import('./types').ConversationTurn[]>;
}

export interface MemoryIndexer {
  index(entry: AIMemoryEntry): Promise<void>;
  reindex(entryId: string): Promise<void>;
  removeFromIndex(entryId: string): Promise<void>;
  rebuildIndex(): Promise<void>;
}

export interface MemoryLifecycleManager {
  expire(): Promise<number>;
  decay(factor: number): Promise<number>;
  promote(entryId: string, newImportance: number): Promise<void>;
  archive(entryIds: string[]): Promise<void>;
}
