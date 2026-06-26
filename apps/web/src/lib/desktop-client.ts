const AGENT_URL = process.env.DESKTOP_AGENT_URL ?? 'http://localhost:9120';

export async function fetchDesktopAgent<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${AGENT_URL}${path}`, {
      signal: AbortSignal.timeout(2000),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

export interface DesktopStatusResponse {
  activeWindow: { app: string; title: string } | null;
  systemInfo: {
    platform: string;
    hostname: string;
    cpu: { model: string; cores: number; usage: number };
    memory: { total: number; used: number; percentage: number };
    timezone: string;
    uptime: number;
  };
  ideState: { ide: string; workspace?: string; project?: string; language?: string; gitBranch?: string } | null;
  browserState: { browser: string; tabCount: number; activeTab?: { title: string; domain: string } } | null;
  productivity: ProductivityResponse;
  uptime: number;
  collecting: boolean;
}

export interface ProductivityResponse {
  date: string;
  focusTimeSeconds: number;
  idleTimeSeconds: number;
  totalTimeSeconds: number;
  contextSwitches: number;
  longestFocusSeconds: number;
  longestFocusApp: string;
  topApps: { app: string; seconds: number; percentage: number }[];
  score: number;
}

export interface ActivityResponse {
  timeline: {
    entries: { app: string; title: string; startedAt: string; durationSeconds: number }[];
    totalActiveSeconds: number;
    totalIdleSeconds: number;
  };
  recent: { app: string; title: string; startedAt: string; durationSeconds: number }[];
}

export interface AppsResponse {
  apps: { app: string; seconds: number }[];
  count: number;
}
