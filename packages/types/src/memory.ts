import type { BaseEntity } from './base';

export type MemoryType = 'embedding' | 'knowledge' | 'context' | 'conversation' | 'document';

export interface Memory extends BaseEntity {
  type: MemoryType;
  content: string;
  source: string;
  embedding_id?: string;
  score?: number;
  expires_at?: string;
  tags: string[];
  metadata: Record<string, unknown>;
}
