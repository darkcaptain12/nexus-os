import type { HandoffContext, HandoffKind } from './types';
import { recordHandoff } from '@/lib/knowledge/auto-linker';

// Handoff Engine — session continuity: Mac'te başlayan Voice/Agent/Executive/
// Workflow/Commerce/Trading oturumu başka cihazdan devam eder. Context düz
// JSON snapshot taşır (voice conversationId, agent state...). TTL 5 dk.

const MAX_HANDOFFS = 100;
const HANDOFF_TTL_MS = 5 * 60_000;

const g = globalThis as unknown as { __apexCloudHandoffs?: HandoffContext[] };

function store(): HandoffContext[] {
  if (!g.__apexCloudHandoffs) g.__apexCloudHandoffs = [];
  return g.__apexCloudHandoffs;
}

function expireStale(): void {
  const now = Date.now();
  for (const h of store()) {
    if (h.state === 'pending' && new Date(h.expiresAt).getTime() < now) h.state = 'expired';
  }
}

export interface CreateHandoffInput {
  kind: HandoffKind;
  fromDeviceId: string;
  context: Record<string, unknown>; // ör. { conversationId, lastIntent, transcript }
}

/** Handoff oluştur — kaynak cihaz context snapshot'ı bırakır. */
export function createHandoff(input: CreateHandoffInput): HandoffContext {
  const now = Date.now();
  const handoff: HandoffContext = {
    id: crypto.randomUUID(),
    kind: input.kind,
    fromDeviceId: input.fromDeviceId,
    toDeviceId: null,
    context: input.context,
    state: 'pending',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + HANDOFF_TTL_MS).toISOString(),
  };
  const s = store();
  s.push(handoff);
  if (s.length > MAX_HANDOFFS) s.shift();
  return handoff;
}

/**
 * Handoff devral — hedef cihaz en yeni pending handoff'u alır (kind filtreli).
 * Kaynak cihazın kendisi devralamaz. Devir Knowledge Graph'a yazılır.
 */
export function claimHandoff(deviceId: string, kind?: HandoffKind): HandoffContext | null {
  expireStale();
  const pending = [...store()]
    .reverse()
    .find(
      (h) => h.state === 'pending' && h.fromDeviceId !== deviceId && (!kind || h.kind === kind),
    );
  if (!pending) return null;

  pending.state = 'claimed';
  pending.toDeviceId = deviceId;
  pending.claimedAt = new Date().toISOString();

  recordHandoff({ kind: pending.kind, fromDeviceId: pending.fromDeviceId, toDeviceId: deviceId });
  return pending;
}

export function getHandoffs(state?: HandoffContext['state'], limit = 30): HandoffContext[] {
  expireStale();
  let items = [...store()].reverse();
  if (state) items = items.filter((h) => h.state === state);
  return items.slice(0, limit);
}

export function getPendingHandoffCount(): number {
  expireStale();
  return store().filter((h) => h.state === 'pending').length;
}
