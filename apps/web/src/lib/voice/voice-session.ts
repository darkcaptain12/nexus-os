import type {
  ConversationSession,
  ConversationTurn,
  VoiceSessionState,
  VoiceLanguage,
  VoiceGender,
  VoiceSettings,
} from './types';

// Voice Session — state machine (sleeping/listening/thinking/speaking/idle) +
// follow-up penceresi (wake word olmadan devam) + ring buffer. Event-driven,
// poll yok. Tek aktif oturum; geçmiş ring buffer'da.

const MAX_TURNS_PER_SESSION = 100;
const MAX_ARCHIVED_SESSIONS = 50;

const DEFAULT_SETTINGS: VoiceSettings = {
  language: 'tr',
  gender: 'female',
  sttProvider: 'client-native',
  ttsProvider: 'client-synthesis',
  wakeWordEnabled: true,
  followUpTimeoutSeconds: 30,
  wakeConfidenceThreshold: 0.85,
};

interface SessionStore {
  current: ConversationSession | null;
  archived: ConversationSession[];
  settings: VoiceSettings;
  responseTimesMs: number[];
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
}

const g = globalThis as unknown as { __apexVoiceSession?: SessionStore };

function store(): SessionStore {
  if (!g.__apexVoiceSession) {
    g.__apexVoiceSession = {
      current: null,
      archived: [],
      settings: { ...DEFAULT_SETTINGS },
      responseTimesMs: [],
      micPermission: 'unknown',
    };
  }
  return g.__apexVoiceSession;
}

export function getSettings(): VoiceSettings {
  return { ...store().settings };
}

export function updateSettings(patch: Partial<VoiceSettings>): VoiceSettings {
  const st = store();
  st.settings = { ...st.settings, ...patch };
  return { ...st.settings };
}

export function setMicPermission(perm: SessionStore['micPermission']): void {
  store().micPermission = perm;
}

export function getMicPermission(): SessionStore['micPermission'] {
  return store().micPermission;
}

/** Voice AI'yı başlat — sleeping durumunda wake word bekler (düşük CPU). */
export function startVoice(language?: VoiceLanguage, gender?: VoiceGender): ConversationSession {
  const st = store();
  if (st.current?.active) return st.current;

  const now = new Date().toISOString();
  const session: ConversationSession = {
    id: crypto.randomUUID(),
    state: 'sleeping',
    language: language ?? st.settings.language,
    gender: gender ?? st.settings.gender,
    turns: [],
    wakeCount: 0,
    startedAt: now,
    lastActivityAt: now,
    followUpExpiresAt: null,
    active: true,
  };
  st.current = session;
  return session;
}

/** Durdur — oturumu arşivle. */
export function stopVoice(): ConversationSession | null {
  const st = store();
  if (!st.current) return null;
  st.current.active = false;
  st.current.state = 'sleeping';
  st.archived.push(st.current);
  if (st.archived.length > MAX_ARCHIVED_SESSIONS) st.archived.shift();
  const stopped = st.current;
  st.current = null;
  return stopped;
}

export function getCurrentSession(): ConversationSession | null {
  return store().current;
}

export function transitionState(state: VoiceSessionState): ConversationSession | null {
  const st = store();
  if (!st.current) return null;
  st.current.state = state;
  st.current.lastActivityAt = new Date().toISOString();
  return st.current;
}

/** Wake word tetiklendi — uyandır, follow-up penceresi başlat. */
export function wake(): ConversationSession | null {
  const st = store();
  if (!st.current) return null;
  st.current.wakeCount++;
  st.current.state = 'listening';
  st.current.lastActivityAt = new Date().toISOString();
  refreshFollowUp();
  return st.current;
}

/** Follow-up penceresini uzat (her turdan sonra). */
export function refreshFollowUp(): void {
  const st = store();
  if (!st.current) return;
  const timeout = st.settings.followUpTimeoutSeconds * 1000;
  st.current.followUpExpiresAt = new Date(Date.now() + timeout).toISOString();
}

/** Follow-up aktif mi? — wake word olmadan konuşma devam edebilir mi? */
export function isFollowUpActive(): boolean {
  const st = store();
  if (!st.current?.followUpExpiresAt) return false;
  return new Date(st.current.followUpExpiresAt).getTime() > Date.now();
}

/** Follow-up süresi doldu — sleeping'e dön. */
export function checkFollowUpTimeout(): boolean {
  const st = store();
  if (!st.current) return false;
  if (st.current.followUpExpiresAt && !isFollowUpActive() && st.current.state !== 'sleeping') {
    st.current.state = 'sleeping';
    st.current.followUpExpiresAt = null;
    return true; // timeout oldu
  }
  return false;
}

export function addTurn(turn: Omit<ConversationTurn, 'id' | 'createdAt'>): ConversationTurn {
  const st = store();
  if (!st.current) throw new Error('Aktif voice oturumu yok');
  const full: ConversationTurn = {
    ...turn,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  st.current.turns.push(full);
  if (st.current.turns.length > MAX_TURNS_PER_SESSION) st.current.turns.shift();
  st.current.lastActivityAt = full.createdAt;
  return full;
}

export function recordResponseTime(ms: number): void {
  const st = store();
  st.responseTimesMs.push(ms);
  if (st.responseTimesMs.length > 100) st.responseTimesMs.shift();
}

export function getAverageResponseMs(): number {
  const times = store().responseTimesMs;
  if (times.length === 0) return 0;
  return Math.round(times.reduce((s, v) => s + v, 0) / times.length);
}

export function getArchivedSessions(limit = 10): ConversationSession[] {
  return store().archived.slice(-limit).reverse();
}

/** Interrupt — konuşurken "dur": speaking → idle, follow-up korunur. */
export function interrupt(): ConversationSession | null {
  const st = store();
  if (!st.current) return null;
  if (st.current.state === 'speaking' || st.current.state === 'thinking') {
    st.current.state = 'idle';
    st.current.lastActivityAt = new Date().toISOString();
  }
  return st.current;
}

export function getTotalTurns(): number {
  const st = store();
  const current = st.current?.turns.length ?? 0;
  const archived = st.archived.reduce((s, sess) => s + sess.turns.length, 0);
  return current + archived;
}
