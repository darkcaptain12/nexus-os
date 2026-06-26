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

export interface ActivityEntry {
  app: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
}

export interface ActivityTimeline {
  date: string;
  entries: ActivityEntry[];
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  sessionStart: string;
  sessionEnd?: string;
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
  score: number;
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
}

export interface AgentConfig {
  pollIntervalMs: number;
  idleThresholdSeconds: number;
  focusThresholdSeconds: number;
  enabled: boolean;
  collectBrowser: boolean;
  collectIDE: boolean;
}

export const DEFAULT_CONFIG: AgentConfig = {
  pollIntervalMs: 5000,
  idleThresholdSeconds: 300,
  focusThresholdSeconds: 120,
  enabled: true,
  collectBrowser: true,
  collectIDE: true,
};
