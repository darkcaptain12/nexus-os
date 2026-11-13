import type { KnowledgeNode, KnowledgeNodeType } from './types';
import { getKnowledgeGraph } from './graph-store';
import { link, linkChain } from './relationship-engine';
import { extractEntities } from '@/lib/memory/entity-extractor';

// Automatic Linking — yeni bilgi geldiğinde otomatik ilişkilendirme.
// Mevcut entity-extractor YENİDEN KULLANILIR (duplicate yasak); üstüne
// domain sözlüğü (borsa/kripto/strateji) eklenir.

const EXCHANGE_NAMES = new Set(['binance', 'mexc', 'bybit', 'okx', 'kraken', 'coinbase']);
const CRYPTO_PATTERN = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|AVAX|DOT|LINK|MATIC)(?:USDT|USD|TRY)?\b/gi;
const STRATEGY_KEYWORDS = new Set([
  'ema cross',
  'rsi reversal',
  'smc confluence',
  'momentum',
  'mean reversion',
]);

const ENTITY_TYPE_MAP: Record<string, KnowledgeNodeType> = {
  person: 'person',
  company: 'company',
  project: 'project',
  technology: 'note',
  date: 'note',
  location: 'note',
  product: 'note',
};

/**
 * Serbest metni graph'a bağla: kaynak node oluştur, metindeki varlıkları
 * çıkar, `references` ilişkileriyle ilişkilendir. Dönen liste yeni değen node'lar.
 */
export function ingestText(
  sourceType: KnowledgeNodeType,
  sourceName: string,
  text: string,
  metadata: Record<string, unknown> = {},
): { source: KnowledgeNode; linked: KnowledgeNode[] } {
  const graph = getKnowledgeGraph();
  const source = graph.upsertNode(sourceType, sourceName, text.slice(0, 500), metadata);
  const linked: KnowledgeNode[] = [];

  // 1) Mevcut entity extractor (kişi/şirket/teknoloji/tarih)
  for (const entity of extractEntities(text)) {
    if (entity.confidence < 0.6) continue;
    const type = ENTITY_TYPE_MAP[entity.type] ?? 'note';
    const result = link(
      { type: sourceType, name: sourceName },
      'references',
      { type, name: entity.name },
      entity.confidence,
    );
    linked.push(result.target);
  }

  // 2) Borsa isimleri → exchange node + uses ilişkisi
  const lower = text.toLowerCase();
  for (const exchange of EXCHANGE_NAMES) {
    if (lower.includes(exchange)) {
      const result = link(
        { type: sourceType, name: sourceName },
        'uses',
        { type: 'exchange', name: exchange },
        0.9,
      );
      linked.push(result.target);
    }
  }

  // 3) Kripto sembolleri → trade konusu
  const cryptoMatches = text.match(CRYPTO_PATTERN);
  if (cryptoMatches) {
    for (const symbol of new Set(cryptoMatches.map((m) => m.toUpperCase()))) {
      const result = link(
        { type: sourceType, name: sourceName },
        'references',
        { type: 'note', name: symbol },
        0.85,
      );
      linked.push(result.target);
    }
  }

  // 4) Strateji isimleri
  for (const strategy of STRATEGY_KEYWORDS) {
    if (lower.includes(strategy)) {
      const result = link(
        { type: sourceType, name: sourceName },
        'uses',
        { type: 'strategy', name: strategy },
        0.85,
      );
      linked.push(result.target);
    }
  }

  return { source, linked };
}

// ─── Modül-spesifik kayıt yardımcıları ───────────────────────────────────────

/** Agent oluşturuldu: agent → goal (owns), hedef metni otomatik bağlanır. */
export function recordAgentCreated(agentId: string, agentName: string, goal: string): void {
  link(
    { type: 'agent', name: agentName, metadata: { agentId } },
    'owns',
    { type: 'goal', name: goal.slice(0, 120) },
    0.9,
  );
  ingestText('agent', agentName, goal, { agentId });
}

/** Agent adımı tamamlandı: agent → task (owns), task → goal (belongs_to). */
export function recordAgentStep(
  agentId: string,
  agentName: string,
  stepName: string,
  goal: string,
): void {
  const taskName = `${stepName} [${agentName}]`;
  link(
    { type: 'agent', name: agentName, metadata: { agentId } },
    'owns',
    { type: 'task', name: taskName },
    0.9,
  );
  link(
    { type: 'task', name: taskName },
    'belongs_to',
    { type: 'goal', name: goal.slice(0, 120) },
    0.8,
  );
}

/**
 * Trade kaydı: trade → strategy (uses) → decision (generated_from) →
 * risk profili (affects) → portfolio (belongs_to) → market (references).
 */
export function recordTrade(input: {
  symbol: string;
  side: string;
  quantity: number;
  price: number | null;
  exchange: string;
  strategy?: string;
  agentName?: string;
}): void {
  const tradeName = `${input.side.toUpperCase()} ${input.quantity} ${input.symbol} @ ${input.price ?? 'market'}`;
  const trade = { type: 'trade' as const, name: tradeName, metadata: { ...input } };

  if (input.strategy) {
    link(trade, 'uses', { type: 'strategy', name: input.strategy }, 0.9);
  }
  link(
    trade,
    'generated_from',
    { type: 'decision', name: `Trade kararı: ${input.symbol} ${input.side}` },
    0.85,
  );
  link(trade, 'affects', { type: 'note', name: 'Risk Profili' }, 0.8);
  link(trade, 'belongs_to', { type: 'note', name: 'Paper Portfolio' }, 0.9);
  link(trade, 'references', { type: 'note', name: input.symbol }, 0.9);
  link(trade, 'uses', { type: 'exchange', name: input.exchange }, 0.9);
  if (input.agentName) {
    link({ type: 'agent', name: input.agentName }, 'owns', trade, 0.9);
  }
}

/** Piyasa analizi kararı: decision → market/sembol zinciri. */
export function recordMarketAnalysis(symbol: string, exchange: string, summary: string): void {
  const decisionName = `Analiz: ${symbol} (${new Date().toISOString().slice(0, 10)})`;
  link(
    { type: 'decision', name: decisionName, content: summary.slice(0, 300) },
    'references',
    { type: 'note', name: symbol },
    0.9,
  );
  link(
    { type: 'decision', name: decisionName },
    'uses',
    { type: 'exchange', name: exchange },
    0.85,
  );
  ingestText('decision', decisionName, summary);
}

/**
 * Desktop aktivitesi: file → ide (uses), website → project (references),
 * window → task zinciri.
 */
export function recordDesktopActivity(input: {
  app: string;
  windowTitle?: string;
  filePath?: string;
  url?: string;
  projectHint?: string;
}): void {
  const items: { type: KnowledgeNodeType; name: string }[] = [];

  if (input.filePath)
    items.push({ type: 'file', name: input.filePath.split('/').pop() ?? input.filePath });
  items.push({ type: 'note', name: input.app });
  if (input.url) {
    try {
      items.push({ type: 'website', name: new URL(input.url).hostname });
    } catch {
      items.push({ type: 'website', name: input.url.slice(0, 80) });
    }
  }
  if (input.projectHint) items.push({ type: 'project', name: input.projectHint });

  if (items.length >= 2) {
    linkChain(items, 'related_to', 0.7);
  }
  if (input.windowTitle) {
    ingestText('note', input.app, input.windowTitle);
  }
}

// ─── Desktop Intelligence (Sprint 16) ────────────────────────────────────────

/**
 * Ekran anlama zinciri: app → dosya → proje → görev → müşteri gibi ilişkileri
 * graph'a bağlar. Photoshop→dosya→katman→proje→görev→müşteri örneği.
 */
export function recordScreenContext(input: {
  app: string;
  entities: { role: string; name: string }[];
  summary: string;
}): void {
  const ROLE_TYPE: Record<string, KnowledgeNodeType> = {
    app: 'note',
    file: 'file',
    layer: 'note',
    project: 'project',
    task: 'task',
    customer: 'company',
    branch: 'note',
    url: 'website',
    error: 'note',
  };
  const chain: { type: KnowledgeNodeType; name: string }[] = [
    { type: 'note', name: input.app },
    ...input.entities.map((e) => ({ type: ROLE_TYPE[e.role] ?? 'note', name: e.name })),
  ];
  if (chain.length >= 2) linkChain(chain, 'related_to', 0.75);
  if (input.summary) ingestText('note', `Ekran: ${input.app}`, input.summary);
}

/** OCR/dosya içeriği: kaynak → çıkarılan entity'ler (references) + metin ingest. */
export function recordExtractedContent(input: {
  sourceType: KnowledgeNodeType;
  sourceName: string;
  contentKind: string;
  text: string;
}): { linked: KnowledgeNode[] } {
  const { linked } = ingestText(input.sourceType, input.sourceName, input.text, {
    contentKind: input.contentKind,
  });
  return { linked };
}

/** Clipboard girişi: içerik tipine göre uygun node + references ilişkisi. */
export function recordClipboard(input: {
  kind: string;
  content: string;
  sourceApp?: string;
}): void {
  const preview = input.content.slice(0, 80);
  if (input.kind === 'link') {
    try {
      link(
        { type: 'note', name: 'Clipboard' },
        'references',
        { type: 'website', name: new URL(input.content).hostname },
        0.7,
      );
    } catch {
      // geçersiz URL — atla
    }
  } else if (input.kind === 'filepath') {
    link(
      { type: 'note', name: 'Clipboard' },
      'references',
      { type: 'file', name: input.content.split('/').pop() ?? preview },
      0.7,
    );
  } else if (input.kind === 'code') {
    ingestText('note', `Clipboard kod (${input.sourceApp ?? 'bilinmeyen'})`, input.content);
  }
}

// ─── Commerce Intelligence (Sprint 19) ───────────────────────────────────────

/** Keşfedilen/skorlanan ürün → project + karar bağlantısı. */
export function recordCommerceProduct(input: {
  title: string;
  source: string;
  score: number;
  verdict: string;
}): void {
  link(
    {
      type: 'note',
      name: `Ürün: ${input.title.slice(0, 80)}`,
      metadata: { score: input.score, verdict: input.verdict },
    },
    'generated_from',
    { type: 'decision', name: `Product Hunter kararı: ${input.verdict} (skor ${input.score})` },
    0.8,
  );
  link(
    { type: 'note', name: `Ürün: ${input.title.slice(0, 80)}` },
    'uses',
    { type: 'company', name: input.source },
    0.7,
  );
}

/** Reklam kampanyası → ürün + platform bağlantısı. */
export function recordAdCampaign(input: {
  campaignName: string;
  platform: string;
  productTitle: string;
}): void {
  link(
    { type: 'note', name: `Kampanya: ${input.campaignName.slice(0, 80)}` },
    'references',
    { type: 'note', name: `Ürün: ${input.productTitle.slice(0, 80)}` },
    0.8,
  );
  link(
    { type: 'note', name: `Kampanya: ${input.campaignName.slice(0, 80)}` },
    'uses',
    { type: 'company', name: input.platform },
    0.7,
  );
}

// ─── Developer Platform (Sprint 21) ──────────────────────────────────────────

/** Plugin → Action → Workflow zinciri. Plugin ilişkileri graph'a yazılır. */
export function recordPlugin(input: {
  id: string;
  name: string;
  category: string;
  actions: string[];
}): void {
  const pluginNode = {
    type: 'note' as const,
    name: `Plugin: ${input.name}`,
    metadata: { pluginId: input.id, category: input.category },
  };
  link(pluginNode, 'belongs_to', { type: 'company', name: input.category }, 0.7);
  for (const action of input.actions.slice(0, 5)) {
    link(pluginNode, 'uses', { type: 'note', name: `Action: ${action}` }, 0.75);
  }
}

// ─── Cloud Multi-Device (Sprint 22) ──────────────────────────────────────────

/** User → Device zinciri. Cihaz kaydı graph'a yazılır. */
export function recordDevice(input: {
  id: string;
  name: string;
  type: string;
  platform: string;
}): void {
  const deviceNode = {
    type: 'note' as const,
    name: `Cihaz: ${input.name}`,
    metadata: { deviceId: input.id, deviceType: input.type, platform: input.platform },
  };
  link(deviceNode, 'belongs_to', { type: 'person', name: 'Emir' }, 0.9);
  link(deviceNode, 'uses', { type: 'note', name: `Platform: ${input.platform}` }, 0.7);
}

/** Device → Session → Workflow zinciri. Handoff devri graph'a yazılır. */
export function recordHandoff(input: {
  kind: string;
  fromDeviceId: string;
  toDeviceId: string;
}): void {
  const sessionNode = {
    type: 'note' as const,
    name: `Handoff: ${input.kind} (${input.fromDeviceId.slice(0, 8)}→${input.toDeviceId.slice(0, 8)})`,
    metadata: { kind: input.kind, from: input.fromDeviceId, to: input.toDeviceId },
  };
  link(
    sessionNode,
    'generated_from',
    { type: 'note', name: `Cihaz oturumu: ${input.fromDeviceId.slice(0, 8)}` },
    0.8,
  );
  link(sessionNode, 'affects', { type: 'workflow', name: `${input.kind} devamlılığı` }, 0.75);
}

// ─── Self-Optimization / Learning (Sprint 23) ────────────────────────────────

/** Ders → Domain → Önlem zinciri. Executive'in öğrendiği dersler graph'a yazılır. */
export function recordLearning(input: {
  domain: string;
  title: string;
  cause: string;
  prevention: string;
  risk: string;
}): void {
  const lessonNode = {
    type: 'decision' as const,
    name: `Ders: ${input.title.slice(0, 80)}`,
    metadata: { domain: input.domain, recurrenceRisk: input.risk },
  };
  link(lessonNode, 'generated_from', { type: 'note', name: `Başarısızlık: ${input.domain}` }, 0.8);
  link(
    lessonNode,
    'affects',
    { type: 'note', name: `Önlem: ${input.prevention.slice(0, 60)}` },
    0.75,
  );
}
