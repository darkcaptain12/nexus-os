import type { ErrorClassification } from './types';

export interface ErrorRegistryEntry {
  classification: ErrorClassification;
  count: number;
  lastOccurredAt: string;
  lastMessage: string;
}

/** Central error tally — what withErrorBoundary() feeds, what the dashboard reads. No source-level coupling to error-boundary.ts to avoid a circular import. */
class ErrorRegistry {
  private counts = new Map<
    ErrorClassification,
    { count: number; lastOccurredAt: string; lastMessage: string }
  >();

  record(classification: ErrorClassification, message: string): void {
    const existing = this.counts.get(classification) ?? {
      count: 0,
      lastOccurredAt: '',
      lastMessage: '',
    };
    existing.count++;
    existing.lastOccurredAt = new Date().toISOString();
    existing.lastMessage = message.slice(0, 200);
    this.counts.set(classification, existing);
  }

  getAll(): ErrorRegistryEntry[] {
    return [...this.counts.entries()]
      .map(([classification, v]) => ({ classification, ...v }))
      .sort((a, b) => b.count - a.count);
  }

  getTotal(): number {
    return [...this.counts.values()].reduce((sum, v) => sum + v.count, 0);
  }

  reset(): void {
    this.counts.clear();
  }
}

let instance: ErrorRegistry | null = null;

export function getErrorRegistry(): ErrorRegistry {
  if (!instance) instance = new ErrorRegistry();
  return instance;
}
