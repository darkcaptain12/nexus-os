// Voice AI v1.0 — Gerçek "Hey APEX" tipleri (Sprint 17)

export type VoiceLanguage = 'tr' | 'en';
export type VoiceGender = 'male' | 'female';

// ─── Session State Machine ───────────────────────────────────────────────────

export type VoiceSessionState =
  | 'sleeping' // wake word bekliyor, düşük CPU
  | 'listening' // kullanıcıyı dinliyor (STT aktif)
  | 'thinking' // intent işleniyor
  | 'speaking' // TTS cevap veriyor
  | 'idle'; // uyanık ama boşta (follow-up penceresi)

// ─── Wake Word ───────────────────────────────────────────────────────────────

export interface WakeWordResult {
  detected: boolean;
  confidence: number; // 0-1
  phrase: string;
  falsePositiveFiltered: boolean;
  reason?: string;
}

export interface WakeWordDetector {
  name: string;
  /** İstemci ses/transkript snippet'ini "hey apex"e karşı skorlar */
  detect(transcript: string, threshold?: number): WakeWordResult;
}

// ─── STT (Speech To Text) ────────────────────────────────────────────────────

export interface SttRequest {
  /** İstemci-tarafı STT çıktısı (browser SpeechRecognition / native) VEYA ham */
  transcript?: string;
  audioRef?: string;
  language: VoiceLanguage;
}

export interface SttResult {
  text: string;
  language: VoiceLanguage;
  confidence: number;
  provider: string;
  durationMs: number;
}

export interface SttProvider {
  name: string;
  supportsAudio: boolean;
  languages: VoiceLanguage[];
  transcribe(request: SttRequest): Promise<{ text: string; confidence: number }>;
}

// ─── TTS (Text To Speech) ────────────────────────────────────────────────────

export interface TtsRequest {
  text: string;
  language: VoiceLanguage;
  gender: VoiceGender;
}

export interface TtsResult {
  /** İstemci-tarafı sentez için metin + ses yönergeleri (SSML-benzeri) */
  text: string;
  language: VoiceLanguage;
  gender: VoiceGender;
  voiceId: string;
  provider: string;
  /** İstemcinin oynatacağı ses referansı (provider audio üretiyorsa) */
  audioRef?: string;
  durationMs: number;
}

export interface TtsProvider {
  name: string;
  producesAudio: boolean;
  voices: { id: string; language: VoiceLanguage; gender: VoiceGender }[];
  synthesize(request: TtsRequest): Promise<{ voiceId: string; audioRef?: string }>;
}

// ─── Conversation ────────────────────────────────────────────────────────────

export interface ConversationTurn {
  id: string;
  role: 'user' | 'apex';
  text: string;
  intent?: string;
  requiresApproval?: boolean;
  createdAt: string;
}

export interface ConversationSession {
  id: string;
  state: VoiceSessionState;
  language: VoiceLanguage;
  gender: VoiceGender;
  turns: ConversationTurn[];
  wakeCount: number;
  startedAt: string;
  lastActivityAt: string;
  /** Follow-up penceresi — wake word olmadan konuşma devam eder */
  followUpExpiresAt: string | null;
  active: boolean;
}

export interface VoiceTurnResult {
  session: ConversationSession;
  userTurn: ConversationTurn;
  apexTurn: ConversationTurn;
  tts: TtsResult;
  requiresApproval: boolean;
  intent: string;
  followUpActive: boolean;
}

// ─── Voice Settings ──────────────────────────────────────────────────────────

export interface VoiceSettings {
  language: VoiceLanguage;
  gender: VoiceGender;
  sttProvider: string;
  ttsProvider: string;
  wakeWordEnabled: boolean;
  followUpTimeoutSeconds: number;
  wakeConfidenceThreshold: number;
}

// ─── Status & Health ─────────────────────────────────────────────────────────

export interface VoiceStatus {
  state: VoiceSessionState;
  active: boolean;
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  wakeCount: number;
  totalTurns: number;
  averageResponseMs: number;
  sttProvider: string;
  ttsProvider: string;
  sttProvidersAvailable: string[];
  ttsProvidersAvailable: string[];
  wakeWordEnabled: boolean;
  /** Wake word sürekli çalışırken CPU dostu (event-driven, poll yok) */
  cpuFriendly: boolean;
  listeningIndicator: boolean;
  followUpActive: boolean;
  generatedAt: string;
}
