// Mobile Platform v1.0 — framework-bağımsız tipler (Sprint 18)
// Mobil katman FACADE'dir: mevcut servisleri (Executive/Agent/Voice/Desktop/
// Knowledge/Trading/Commerce) aggregate eder. Yeni iş mantığı YOK.

export type DevicePlatform = 'ios' | 'ipad' | 'android' | 'apple-watch' | 'wear-os';

export type PushCategory =
  | 'trading'
  | 'commerce'
  | 'agent'
  | 'desktop'
  | 'memory'
  | 'workflow'
  | 'approval'
  | 'risk';

export type PushSeverity = 'info' | 'warning' | 'critical';

export type SyncEntity = 'executive' | 'tasks' | 'projects' | 'trading' | 'commerce' | 'memory';

// ─── Device Registry ─────────────────────────────────────────────────────────

export interface MobileDevice {
  id: string;
  platform: DevicePlatform;
  name: string;
  pushToken?: string;
  batteryLevel: number | null;
  online: boolean;
  lastSeenAt: string;
  registeredAt: string;
  appVersion?: string;
}

// ─── Push Notification ───────────────────────────────────────────────────────

export interface PushNotification {
  id: string;
  category: PushCategory;
  severity: PushSeverity;
  title: string;
  body: string;
  deepLink?: string;
  requiresApproval: boolean;
  createdAt: string;
  deliveredTo: string[];
}

// ─── Home Dashboard ──────────────────────────────────────────────────────────

export interface MobileHomeDashboard {
  executiveSummary: {
    focus: string;
    riskScore: number;
    recommendationCount: number;
    cycleState: string;
  };
  dailyPlan: { greeting: string; date: string; taskCount: number; goalCount: number };
  trading: { equity: number; todayPnl: number; openPositions: number };
  commerce: { totalOrders: number; pendingOrders: number; revenue: number; alerts: number };
  agents: { total: number; running: number; waitingApproval: number; successRate: number };
  desktop: { activeApp: string | null; activeProject: string | null; online: boolean };
  memoryHealth: number;
  generatedAt: string;
}

// ─── Approval Center ─────────────────────────────────────────────────────────

export interface MobileApprovalItem {
  id: string;
  source: 'ai' | 'action-engine';
  category: PushCategory;
  title: string;
  description: string;
  reasoning: string;
  createdAt: string;
}

// ─── Trading / Commerce Mobile (reuse) ───────────────────────────────────────

export interface MobileTradingView {
  equity: number;
  balance: number;
  todayPnl: number;
  unrealizedPnl: number;
  openPositions: { symbol: string; direction: string; pnl: number }[];
  mode: 'paper' | 'live';
}

// ─── Desktop Companion ───────────────────────────────────────────────────────

export interface DesktopCompanion {
  online: boolean;
  activeApp: string | null;
  activeProject: string | null;
  ide: { name: string; file?: string; language?: string; branch?: string } | null;
  lastClipboardKind: string | null;
  lastOcrKind: string | null;
  updatedAt: string;
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

export type WidgetSize = 'small' | 'medium' | 'large' | 'lock-screen' | 'material';

export interface WidgetData {
  size: WidgetSize;
  platform: DevicePlatform;
  title: string;
  lines: { label: string; value: string; accent?: 'up' | 'down' | 'neutral' }[];
  updatedAt: string;
}

// ─── Wearable (Apple Watch / Wear OS) ────────────────────────────────────────

export interface WearableView {
  executive: { focus: string; riskScore: number };
  trading: { equity: number; todayPnl: number };
  tasks: { pending: number; dueToday: number };
  approvals: number;
  voiceReady: boolean;
  notifications: { title: string; category: PushCategory }[];
  generatedAt: string;
}

// ─── Offline ─────────────────────────────────────────────────────────────────

export interface OfflineSnapshot {
  executive: MobileHomeDashboard['executiveSummary'] | null;
  tasks: { title: string; status: string }[];
  projects: { name: string; progress: number }[];
  trading: MobileTradingView | null;
  commerce: MobileHomeDashboard['commerce'] | null;
  memorySummary: { health: number; entries: number };
  cachedAt: string;
}

export interface OfflineMutation {
  id: string;
  entity: SyncEntity;
  action: string;
  payload: Record<string, unknown>;
  deviceId: string;
  createdAt: string;
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export type SyncConflictStrategy = 'server-wins' | 'client-wins' | 'last-write-wins';

export interface SyncResult {
  applied: number;
  conflicts: { mutationId: string; resolved: SyncConflictStrategy; reason: string }[];
  queueRemaining: number;
  syncedAt: string;
}

// ─── System Dashboard (Mobile Health) ────────────────────────────────────────

export interface MobileSystemHealth {
  connectedDevices: number;
  devices: { platform: DevicePlatform; name: string; online: boolean; battery: number | null }[];
  pushQueueLength: number;
  pushDeliveredTotal: number;
  offlineQueueLength: number;
  syncQueueLength: number;
  watchConnected: boolean;
  lastSyncAt: string | null;
  eventDriven: boolean;
  generatedAt: string;
}
