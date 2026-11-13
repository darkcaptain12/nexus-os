// Cloud Sync + Multi Device v1.0 — framework-bağımsız tipler (Sprint 22)
// Cloud katmanı ORKESTRASYON'dur: mevcut Mobile device-registry/sync-client/
// offline-store/notification-center üstüne kurulur. Yeni iş mantığı minimumda.

export type CloudDeviceType =
  | 'mac'
  | 'windows'
  | 'iphone'
  | 'ipad'
  | 'apple-watch'
  | 'android'
  | 'wear-os'
  | 'web';

export type CloudDeviceState = 'pending' | 'active' | 'disabled' | 'revoked';

export type NetworkKind = 'wifi' | 'cellular' | 'ethernet' | 'offline';

export interface CloudDevice {
  id: string;
  name: string;
  type: CloudDeviceType;
  platform: string; // "macOS 15.5", "iOS 19.2" gibi
  version: string; // uygulama sürümü
  capabilities: string[]; // 'voice' | 'ocr' | 'push' | 'widgets' | 'trading' ...
  battery: number | null;
  network: NetworkKind;
  lastSeen: string;
  pushToken?: string;
  trusted: boolean;
  verified: boolean;
  state: CloudDeviceState;
  pairedAt: string;
  encryption: { algorithm: string; keyId: string; rotatedAt: string };
}

// ─── Presence ────────────────────────────────────────────────────────────────

export type PresenceStatus = 'online' | 'offline' | 'idle' | 'busy' | 'sleeping';

export interface DevicePresence {
  deviceId: string;
  status: PresenceStatus;
  reportedAt: string;
  derived: boolean; // heartbeat gecikmesinden türetildi mi
}

// ─── Sync Engine v2 ──────────────────────────────────────────────────────────

export type SyncDomain =
  | 'tasks'
  | 'projects'
  | 'memory'
  | 'knowledge'
  | 'commerce'
  | 'trading'
  | 'executive'
  | 'agents'
  | 'notifications'
  | 'plugins'
  | 'settings';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncDelta {
  id: string;
  domain: SyncDomain;
  key: string; // entity id
  operation: SyncOperation;
  payload: Record<string, unknown>;
  deviceId: string;
  version: number; // domain:key başına monoton artan
  baseVersion: number; // istemcinin gördüğü son versiyon (conflict tespiti)
  createdAt: string;
}

export interface SyncCursor {
  deviceId: string;
  lastDeltaSeq: number; // global sequence — incremental pull
  syncedAt: string;
}

export interface CloudSyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  offlineApplied: number;
  mobileQueueApplied: number;
  queueRemaining: number;
  syncedAt: string;
}

// ─── Conflict Resolution ─────────────────────────────────────────────────────

export type ConflictStrategy = 'last-write-wins' | 'merge' | 'manual-review';

export type ConflictStatus = 'auto-resolved' | 'manual-review' | 'resolved';

export interface SyncConflict {
  id: string;
  domain: SyncDomain;
  key: string;
  local: SyncDelta;
  remote: SyncDelta;
  strategy: ConflictStrategy;
  status: ConflictStatus;
  resolution?: 'local' | 'remote' | 'merged';
  mergedPayload?: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string;
}

// ─── Offline Queue (cloud) ───────────────────────────────────────────────────

export interface CloudQueueItem {
  id: string;
  domain: SyncDomain;
  key: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  deviceId: string;
  contentHash: string; // duplicate prevention
  attempts: number;
  nextRetryAt: string; // exponential backoff
  createdAt: string;
}

// ─── Device Intelligence ─────────────────────────────────────────────────────

export interface DeviceVitals {
  deviceId: string;
  cpuPercent: number;
  ramPercent: number;
  storagePercent: number;
  network: NetworkKind;
  battery: number | null;
  healthScore: number; // 0-100, gerçek formül
  syncStatus: 'synced' | 'behind' | 'never';
  syncLag: number; // görülmemiş delta sayısı
  reportedAt: string;
}

// ─── Notification Routing ────────────────────────────────────────────────────

export interface RoutedNotification {
  notificationId: string;
  category: string;
  severity: string;
  routedTo: { deviceId: string; deviceType: CloudDeviceType; reason: string }[];
  createdAt: string;
}

// ─── Handoff / Session Continuity ────────────────────────────────────────────

export type HandoffKind = 'voice' | 'agent' | 'executive' | 'workflow' | 'commerce' | 'trading';

export interface HandoffContext {
  id: string;
  kind: HandoffKind;
  fromDeviceId: string;
  toDeviceId: string | null;
  context: Record<string, unknown>; // düz JSON — voice conversation, agent state...
  state: 'pending' | 'claimed' | 'expired';
  createdAt: string;
  expiresAt: string;
  claimedAt?: string;
}

// ─── Cloud Backup ────────────────────────────────────────────────────────────

export type BackupDomain = 'memory' | 'knowledge' | 'tasks' | 'projects' | 'plugins' | 'settings';

export interface BackupSnapshot {
  id: string;
  version: number; // monoton artan — version history
  domains: BackupDomain[];
  itemCounts: Record<BackupDomain, number>;
  sizeBytes: number;
  deviceId: string;
  createdAt: string;
}

// ─── Security ────────────────────────────────────────────────────────────────

export type SecurityEventType =
  | 'device-trusted'
  | 'device-revoked'
  | 'session-revoked'
  | 'remote-logout'
  | 'push-token-rotated'
  | 'device-paired'
  | 'device-verified';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  deviceId: string;
  detail: string;
  at: string;
}

// ─── Cloud Status (dashboard/mobile aggregate) ──────────────────────────────

export interface CloudStatus {
  connectedDevices: number;
  totalDevices: number;
  trustedDevices: number;
  presence: { deviceId: string; name: string; type: CloudDeviceType; status: PresenceStatus }[];
  syncQueueLength: number;
  offlineQueueLength: number;
  conflictQueueLength: number;
  lastSyncAt: string | null;
  lastBackup: { version: number; createdAt: string } | null;
  fleetHealthAvg: number;
  pendingHandoffs: number;
  generatedAt: string;
}
