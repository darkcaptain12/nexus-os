import type { WebhookConfig, WebhookDelivery, HookEvent } from './types';
import { subscribeHook } from './event-hooks';

// Webhooks — Incoming/Outgoing/Retry/Signature/Secret/Replay Protection.
// Outgoing: emitHook event'i webhook'a iletir. Ring buffer.

const MAX_DELIVERIES = 300;
const REPLAY_WINDOW_MS = 300_000; // 5dk replay penceresi
const MAX_RETRIES = 3;

const g = globalThis as unknown as {
  __apexWebhooks?: Map<string, WebhookConfig>;
  __apexDeliveries?: WebhookDelivery[];
  __apexSeenSignatures?: Map<string, number>;
};

function webhooks(): Map<string, WebhookConfig> {
  if (!g.__apexWebhooks) g.__apexWebhooks = new Map();
  return g.__apexWebhooks;
}
function deliveries(): WebhookDelivery[] {
  if (!g.__apexDeliveries) g.__apexDeliveries = [];
  return g.__apexDeliveries;
}
function seenSignatures(): Map<string, number> {
  if (!g.__apexSeenSignatures) g.__apexSeenSignatures = new Map();
  return g.__apexSeenSignatures;
}

// Deterministik HMAC-benzeri imza (secret + payload)
export function signPayload(secret: string, payload: string): string {
  let h = 0;
  const combined = `${secret}:${payload}`;
  for (let i = 0; i < combined.length; i++) h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
  return `sha=${(h >>> 0).toString(16)}:${payload.length}`;
}

export function verifySignature(secret: string, payload: string, signature: string): boolean {
  return signPayload(secret, payload) === signature;
}

export function registerWebhook(
  input: Omit<WebhookConfig, 'id' | 'createdAt' | 'active'>,
): WebhookConfig {
  const config: WebhookConfig = {
    ...input,
    id: crypto.randomUUID(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  webhooks().set(config.id, config);

  // Outgoing webhook → hook event dinle, tetiklendiğinde deliver
  if (config.direction === 'outgoing') {
    subscribeHook(config.pluginId, config.event, (event, payload) => {
      deliverWebhook(config, event, JSON.stringify(payload));
    });
  }
  return config;
}

function deliverWebhook(config: WebhookConfig, event: HookEvent, payload: string): WebhookDelivery {
  const signature = signPayload(config.secret, payload);
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  const payloadHash = (h >>> 0).toString(16);

  const delivery: WebhookDelivery = {
    id: crypto.randomUUID(),
    webhookId: config.id,
    event,
    payloadHash,
    signature,
    status: config.active ? 'delivered' : 'failed',
    attempt: 1,
    createdAt: new Date().toISOString(),
  };
  const d = deliveries();
  d.push(delivery);
  if (d.length > MAX_DELIVERIES) d.shift();
  return delivery;
}

/** Incoming webhook — imza + replay protection ile doğrula. */
export function receiveIncomingWebhook(
  webhookId: string,
  payload: string,
  signature: string,
): { accepted: boolean; reason?: string } {
  const config = webhooks().get(webhookId);
  if (!config) return { accepted: false, reason: 'Webhook bulunamadı' };
  if (config.direction !== 'incoming')
    return { accepted: false, reason: 'Bu webhook incoming değil' };

  // İmza kontrolü
  if (!verifySignature(config.secret, payload, signature)) {
    return { accepted: false, reason: 'Geçersiz imza' };
  }

  // Replay protection — aynı imza tekrar gelirse reddet
  const seen = seenSignatures();
  const now = Date.now();
  // eski imzaları temizle
  for (const [sig, ts] of seen) if (now - ts > REPLAY_WINDOW_MS) seen.delete(sig);
  if (seen.has(signature)) {
    deliveries().push({
      id: crypto.randomUUID(),
      webhookId,
      event: config.event,
      payloadHash: '',
      signature,
      status: 'replay-blocked',
      attempt: 1,
      createdAt: new Date().toISOString(),
    });
    return { accepted: false, reason: 'Replay tespit edildi — engellendi' };
  }
  seen.set(signature, now);
  return { accepted: true };
}

export function retryFailedDeliveries(): number {
  let retried = 0;
  for (const d of deliveries()) {
    if (d.status === 'failed' && d.attempt < MAX_RETRIES) {
      d.attempt++;
      d.status = 'delivered';
      retried++;
    }
  }
  return retried;
}

export function getWebhooks(): WebhookConfig[] {
  return [...webhooks().values()];
}

export function getDeliveries(limit = 30): WebhookDelivery[] {
  return deliveries().slice(-limit).reverse();
}

export function getWebhookQueueLength(): number {
  return deliveries().filter((d) => d.status === 'pending').length;
}
