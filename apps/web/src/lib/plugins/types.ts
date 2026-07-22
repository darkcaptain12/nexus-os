// Developer Platform v1.0 — Plugin SDK + Marketplace + Public API tipleri (Sprint 21)
// Mevcut Integration Hub + Registry + OAuth mimarisi üstüne kuruludur.

export type PluginPermission =
  | 'trading'
  | 'commerce'
  | 'desktop'
  | 'voice'
  | 'filesystem'
  | 'clipboard'
  | 'notifications'
  | 'workflow'
  | 'network';

export type PluginCategory =
  | 'ecommerce'
  | 'communication'
  | 'payment'
  | 'storage'
  | 'productivity'
  | 'design'
  | 'developer'
  | 'other';

export type PluginLifecycleState = 'installed' | 'enabled' | 'disabled' | 'error' | 'uninstalled';

export type HookEvent =
  | 'task.created'
  | 'project.updated'
  | 'trade.opened'
  | 'trade.closed'
  | 'order.created'
  | 'product.published'
  | 'approval.required'
  | 'workflow.finished'
  | 'voice.intent'
  | 'desktop.activity';

// ─── Plugin Manifest ─────────────────────────────────────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  permissions: PluginPermission[];
  actions: string[];
  hooks: HookEvent[];
  settings: Record<
    string,
    { type: 'string' | 'number' | 'boolean'; label: string; default?: unknown }
  >;
  icon: string;
  category: PluginCategory;
  description?: string;
}

// ─── Installed Plugin ────────────────────────────────────────────────────────

export interface InstalledPlugin {
  manifest: PluginManifest;
  state: PluginLifecycleState;
  grantedPermissions: PluginPermission[];
  settingsValues: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
  healthStatus: 'healthy' | 'degraded' | 'error';
  lastError?: string;
  invocationCount: number;
}

// ─── Plugin Context (sandbox — sadece izin verilen API'ler) ──────────────────

export interface PluginContextApi {
  pluginId: string;
  hasPermission(permission: PluginPermission): boolean;
  // Public SDK yüzeyi — her çağrı izin kontrollü
  executive?: () => Promise<unknown>;
  memory?: {
    search: (keyword: string) => unknown;
    add: (title: string, description: string) => void;
  };
  knowledge?: { stats: () => unknown; link: (a: string, b: string) => void };
  agent?: { create: (name: string, goal: string) => unknown };
  workflow?: () => unknown;
  trading?: () => Promise<unknown>;
  commerce?: () => Promise<unknown>;
  desktop?: () => unknown;
  voice?: () => unknown;
  notifications?: { push: (title: string, body: string) => void };
}

// ─── Marketplace ─────────────────────────────────────────────────────────────

export interface MarketplaceListing {
  manifest: PluginManifest;
  downloads: number;
  rating: number;
  reviewCount: number;
  official: boolean;
  installed: boolean;
}

export interface PluginReview {
  pluginId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export type WebhookDirection = 'incoming' | 'outgoing';

export interface WebhookConfig {
  id: string;
  pluginId: string;
  direction: WebhookDirection;
  url: string;
  event: HookEvent;
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: HookEvent;
  payloadHash: string;
  signature: string;
  status: 'pending' | 'delivered' | 'failed' | 'replay-blocked';
  attempt: number;
  createdAt: string;
}

// ─── OAuth Apps ──────────────────────────────────────────────────────────────

export interface PluginOAuthApp {
  pluginId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  pkceRequired: boolean;
  openIdEnabled: boolean;
}

// ─── Developer Dashboard ─────────────────────────────────────────────────────

export interface DeveloperDashboard {
  totalPlugins: number;
  enabledPlugins: number;
  disabledPlugins: number;
  errorPlugins: number;
  apiUsageTotal: number;
  eventRate: number;
  webhookQueueLength: number;
  marketplaceCount: number;
  topPlugins: { id: string; name: string; invocations: number; health: string }[];
  generatedAt: string;
}
