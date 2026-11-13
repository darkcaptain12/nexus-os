import type { MemoryRecord } from '@/lib/repositories';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRepositories } from '@/lib/repositories';

export interface RetrievalResult {
  memories: ScoredMemory[];
  sources: string[];
  totalRetrieved: number;
  durationMs: number;
}

export interface ScoredMemory {
  memory: MemoryRecord;
  score: number;
  source: 'keyword' | 'related' | 'recent' | 'entity' | 'type';
}

export async function retrieveContext(
  db: SupabaseClient,
  query: string,
  options?: { types?: string[]; limit?: number; includeRelated?: boolean },
): Promise<RetrievalResult> {
  const start = performance.now();
  const repos = createRepositories(db);
  const limit = options?.limit ?? 20;
  const scored: ScoredMemory[] = [];
  const sources: string[] = [];

  const keywordResult = await repos.memories.searchContent(query, Math.ceil(limit / 2));
  if (keywordResult.data.length > 0) {
    sources.push('keyword');
    for (const memory of keywordResult.data) {
      scored.push({ memory, score: 0.8 + memory.importance * 0.2, source: 'keyword' });
    }
  }

  if (options?.types) {
    for (const type of options.types) {
      const typeResult = await repos.memories.findByType(type, 5);
      sources.push('type');
      for (const memory of typeResult.data) {
        if (!scored.some((s) => s.memory.id === memory.id)) {
          scored.push({ memory, score: 0.5 + memory.importance * 0.3, source: 'type' });
        }
      }
    }
  }

  const entityResult = await repos.memories.findByEntity(query, 5);
  if (entityResult.data.length > 0) {
    sources.push('entity');
    for (const memory of entityResult.data) {
      if (!scored.some((s) => s.memory.id === memory.id)) {
        scored.push({ memory, score: 0.7 + memory.importance * 0.2, source: 'entity' });
      }
    }
  }

  if (options?.includeRelated && scored.length > 0) {
    const topMemory = scored[0]!;
    const related = await repos.memories.findRelated(topMemory.memory.id);
    if (related.memories.length > 0) {
      sources.push('related');
      for (const memory of related.memories.slice(0, 5)) {
        if (!scored.some((s) => s.memory.id === memory.id)) {
          scored.push({ memory, score: 0.4 + memory.importance * 0.2, source: 'related' });
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return {
    memories: scored.slice(0, limit),
    sources: [...new Set(sources)],
    totalRetrieved: scored.length,
    durationMs: Math.round(performance.now() - start),
  };
}
