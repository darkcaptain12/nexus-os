import type { ApprovalItem } from './types';

class AIApprovalQueue {
  private items: ApprovalItem[] = [];

  propose(item: Omit<ApprovalItem, 'id' | 'status' | 'createdAt' | 'expiresAt'>): ApprovalItem {
    const full: ApprovalItem = {
      ...item,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.items.push(full);
    return full;
  }

  approve(id: string): ApprovalItem | null {
    const item = this.items.find((i) => i.id === id && i.status === 'pending');
    if (!item) return null;
    item.status = 'approved';
    return item;
  }

  reject(id: string): ApprovalItem | null {
    const item = this.items.find((i) => i.id === id && i.status === 'pending');
    if (!item) return null;
    item.status = 'rejected';
    return item;
  }

  getPending(): ApprovalItem[] {
    this.expireStale();
    return this.items.filter((i) => i.status === 'pending');
  }

  getAll(limit = 50): ApprovalItem[] {
    return this.items.slice(-limit).reverse();
  }

  private expireStale(): void {
    const now = new Date();
    for (const item of this.items) {
      if (item.status === 'pending' && new Date(item.expiresAt) < now) {
        item.status = 'expired';
      }
    }
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexApprovalQueue?: AIApprovalQueue };

export function getApprovalQueue(): AIApprovalQueue {
  if (!g.__apexApprovalQueue) g.__apexApprovalQueue = new AIApprovalQueue();
  return g.__apexApprovalQueue;
}
