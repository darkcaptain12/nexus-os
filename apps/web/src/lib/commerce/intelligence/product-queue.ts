import type { QueuedProduct, QueueStatus } from './types';
import { deferPersist } from '@/lib/persist-after';
import { persistProductQueue } from '@/lib/persist-stores';

// Product Queue — Hunter çıktısı (skorlanmış ürünler). Ring buffer + Supabase
// write-through (Faz 2 kalıcılık). Publish için Approval Queue'dan geçer.

const MAX_QUEUE = 200;
const g = globalThis as unknown as { __apexProductQueue?: QueuedProduct[] };

function store(): QueuedProduct[] {
  if (!g.__apexProductQueue) g.__apexProductQueue = [];
  return g.__apexProductQueue;
}

export function enqueueProduct(
  item: Omit<QueuedProduct, 'id' | 'status' | 'queuedAt'>,
): QueuedProduct {
  const queued: QueuedProduct = {
    ...item,
    id: crypto.randomUUID(),
    status: 'pending',
    queuedAt: new Date().toISOString(),
  };
  const s = store();
  s.push(queued);
  if (s.length > MAX_QUEUE) s.shift();
  deferPersist(() => persistProductQueue(queued as never)); // write-through
  return queued;
}

export function getQueue(status?: QueueStatus, limit = 50): QueuedProduct[] {
  let items = [...store()].reverse();
  if (status) items = items.filter((q) => q.status === status);
  return items.slice(0, limit);
}

export function getQueuedProduct(id: string): QueuedProduct | null {
  return store().find((q) => q.id === id) ?? null;
}

export function updateQueueStatus(
  id: string,
  status: QueueStatus,
  approvalId?: string,
): QueuedProduct | null {
  const item = store().find((q) => q.id === id);
  if (!item) return null;
  item.status = status;
  if (approvalId) item.approvalId = approvalId;
  deferPersist(() => persistProductQueue(item as never)); // write-through (durum değişimi kalıcı)
  return item;
}

export function getQueueMetrics(): {
  pending: number;
  approved: number;
  published: number;
  topScore: number;
} {
  const s = store();
  return {
    pending: s.filter((q) => q.status === 'pending').length,
    approved: s.filter((q) => q.status === 'approved').length,
    published: s.filter((q) => q.status === 'published').length,
    topScore: s.reduce((max, q) => Math.max(max, q.score.total), 0),
  };
}
