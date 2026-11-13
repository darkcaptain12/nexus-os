export interface ActiveWindow {
  app: string;
  title: string;
  pid: number;
  bundleId?: string;
  path?: string;
}

export interface AppUsage {
  app: string;
  bundleId?: string;
  totalSeconds: number;
  sessionCount: number;
  lastActiveAt: string;
}

export type AppCategory =
  | 'coding'
  | 'browsing'
  | 'communication'
  | 'meeting'
  | 'design'
  | 'writing'
  | 'terminal'
  | 'media'
  | 'system'
  | 'other';

export type TimelineSource = 'window' | 'idle';

export interface ActivityEntry {
  app: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  category: AppCategory;
  source: TimelineSource;
  confidence: number;
}

export interface ActivityTimeline {
  date: string;
  entries: ActivityEntry[];
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  sessionStart: string;
  sessionEnd?: string;
}

export interface DailySummary {
  date: string;
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  entryCount: number;
  topApps: { app: string; seconds: number }[];
}

export interface TimelineMemoryStats {
  entryCount: number;
  maxEntries: number;
  dailySummaryCount: number;
  retentionDays: number;
  estimatedBytes: number;
}

export interface SystemInfo {
  platform: 'darwin' | 'win32' | 'linux';
  osVersion: string;
  hostname: string;
  cpu: { model: string; cores: number; usage: number };
  memory: { total: number; used: number; percentage: number };
  battery?: { level: number; charging: boolean };
  displays: number;
  networkConnected: boolean;
  timezone: string;
  uptime: number;
}

export interface FocusSession {
  app: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  interrupted: boolean;
  category: AppCategory;
}

export interface DeepWorkSession {
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  apps: string[];
  category: AppCategory;
  switchCount: number;
  confidence: number;
}

export interface ProductivityScoreBreakdown {
  focusComponent: number;
  longestFocusBonus: number;
  deepWorkBonus: number;
  codingBonus: number;
  baseline: number;
  switchPenalty: number;
  idlePenalty: number;
  meetingSaturationPenalty: number;
}

export interface ProductivityMetrics {
  date: string;
  focusTimeSeconds: number;
  idleTimeSeconds: number;
  totalTimeSeconds: number;
  contextSwitches: number;
  longestFocusSeconds: number;
  longestFocusApp: string;
  topApps: { app: string; seconds: number; percentage: number }[];
  focusSessions: FocusSession[];
  deepWorkSessions: DeepWorkSession[];
  deepWorkMinutes: number;
  categoryBreakdown: Record<AppCategory, number>;
  score: number;
  scoreBreakdown: ProductivityScoreBreakdown;
}

export interface BrowserTab {
  title: string;
  domain: string;
  windowId: number;
}

export interface BrowserState {
  browser: string;
  tabs: BrowserTab[];
  activeTab?: BrowserTab;
  tabCount: number;
}

export interface IDEState {
  ide: string;
  workspace?: string;
  project?: string;
  language?: string;
  openFileCount: number;
  gitBranch?: string;
}

export interface DesktopStatus {
  activeWindow: ActiveWindow | null;
  systemInfo: SystemInfo;
  ideState: IDEState | null;
  browserState: BrowserState | null;
  productivity: ProductivityMetrics;
  uptime: number;
  collecting: boolean;
  privacyConfig: PrivacyConfig;
}

export interface PrivacyConfig {
  windowTracking: boolean;
  browserTracking: boolean;
  ideTracking: boolean;
  clipboardTracking: boolean;
  screenshotEnabled: boolean;
  sensitiveAppBlacklist: string[];
}

export interface AgentConfig {
  pollIntervalMs: number;
  idleThresholdSeconds: number;
  focusThresholdSeconds: number;
  deepWorkThresholdSeconds: number;
  maxTimelineEntries: number;
  timelineRetentionDays: number;
  enabled: boolean;
  collectBrowser: boolean;
  collectIDE: boolean;
  privacy: PrivacyConfig;
}

export const DEFAULT_PRIVACY: PrivacyConfig = {
  windowTracking: true,
  browserTracking: true,
  ideTracking: true,
  clipboardTracking: false,
  screenshotEnabled: false,
  sensitiveAppBlacklist: ['1Password', 'Keychain Access', 'KeePassXC'],
};

export const DEFAULT_CONFIG: AgentConfig = {
  pollIntervalMs: 5000,
  idleThresholdSeconds: 300,
  focusThresholdSeconds: 120,
  deepWorkThresholdSeconds: 1800,
  maxTimelineEntries: 10000,
  timelineRetentionDays: 30,
  enabled: true,
  collectBrowser: true,
  collectIDE: true,
  privacy: DEFAULT_PRIVACY,
};
