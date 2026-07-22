import type { VoiceTurnResult, ConversationSession } from './types';
import { parseVoiceIntent, handleVoiceIntent } from '@/lib/quant/services/voice-service';
import { detectWakeWord } from './wake-word';
import { synthesize } from './tts-registry';
import { transcribe } from './stt-registry';
import {
  getCurrentSession,
  startVoice,
  wake,
  addTurn,
  transitionState,
  refreshFollowUp,
  isFollowUpActive,
  recordResponseTime,
  interrupt as interruptSession,
  getSettings,
} from './voice-session';
import { recordConversationTurn } from './voice-memory';

// Conversation Engine — doğal konuşma turu. Mevcut intent katmanını (quant
// voice-service parseVoiceIntent/handleVoiceIntent) REUSE eder; STT+wake+TTS+
// session+memory ile sarar. Wake word olmadan follow-up devam eder.

// "dur/stop" — konuşmayı kesme (interrupt)
const INTERRUPT_RE = /^(dur|kes|sus|stop|bekle|iptal|tamam yeter)\b/i;
// Konuşmayı bitirme
const GOODBYE_RE = /(teşekkür|sağol|görüşürüz|kapat|bitir|hoşça kal|thanks|bye)/i;

export interface ProcessTurnInput {
  /** İstemci STT transkripti (ham audio istemcide çözülür) */
  transcript: string;
  /** Wake word gerektir mi? follow-up penceresindeyse false olabilir */
  requireWake?: boolean;
}

/**
 * Bir konuşma turunu işle:
 * 1. Oturum yoksa başlat
 * 2. Wake gerekiyorsa wake word kontrol
 * 3. STT normalize → intent parse (mevcut katman) → handle (Executive/Agent/Quant/Desktop)
 * 4. TTS cevap üret, Memory + KG'ye yaz
 */
export async function processConversationTurn(input: ProcessTurnInput): Promise<VoiceTurnResult> {
  const start = performance.now();
  const settings = getSettings();

  let session = getCurrentSession();
  if (!session?.active) session = startVoice();

  // Interrupt: "dur" — konuşuyorsa kes
  if (INTERRUPT_RE.test(input.transcript.trim())) {
    interruptSession();
    return buildInterruptResult(session, input.transcript);
  }

  // Wake word gereksinimi — follow-up aktifse atlanır
  const followUp = isFollowUpActive();
  const needWake = (input.requireWake ?? true) && !followUp;
  if (needWake) {
    const wakeResult = detectWakeWord(input.transcript, settings.wakeConfidenceThreshold);
    if (!wakeResult.detected) {
      // Uyanmadı — sessiz kal (false positive veya wake yok)
      return buildNoWakeResult(session, input.transcript);
    }
    wake();
    // Wake word'den sonra kalan komut varsa işle, yoksa "Evet Emir?" de
    const command = stripWakePhrase(input.transcript, wakeResult.phrase);
    if (command.trim().length < 2) {
      return await respondGreeting(session, input.transcript, start);
    }
    return await runIntent(session, command, start);
  }

  // Follow-up: wake word olmadan devam
  refreshFollowUp();
  return await runIntent(session, input.transcript, start);
}

function stripWakePhrase(transcript: string, phrase: string): string {
  const lower = transcript.toLocaleLowerCase('tr');
  const idx = lower.indexOf(phrase);
  if (idx === -1) return transcript;
  return transcript.slice(idx + phrase.length).replace(/^[\s,.!?]+/, '');
}

async function runIntent(
  session: ConversationSession,
  text: string,
  start: number,
): Promise<VoiceTurnResult> {
  transitionState('thinking');

  const userTurn = addTurn({ role: 'user', text });

  // MEVCUT intent katmanı — reuse (yeniden yazma yok)
  const intent = parseVoiceIntent(text);
  const response = await handleVoiceIntent(intent);

  // Goodbye → oturumu boşta bırak (follow-up dolunca sleeping'e döner)
  const isGoodbye = GOODBYE_RE.test(text);
  const speech = isGoodbye ? `${response.speech} Görüşmek üzere Emir.` : response.speech;

  const apexTurn = addTurn({
    role: 'apex',
    text: speech,
    intent: response.intent,
    requiresApproval: response.requiresApproval,
  });

  const settings = getSettings();
  transitionState('speaking');
  const tts = await synthesize({
    text: speech,
    language: settings.language,
    gender: settings.gender,
  });

  refreshFollowUp();
  transitionState(isGoodbye ? 'sleeping' : 'idle');

  recordConversationTurn(session.id, userTurn, apexTurn);
  const elapsed = Math.round(performance.now() - start);
  recordResponseTime(elapsed);

  return {
    session: getCurrentSession()!,
    userTurn,
    apexTurn,
    tts,
    requiresApproval: response.requiresApproval,
    intent: response.intent,
    followUpActive: isFollowUpActive(),
  };
}

async function respondGreeting(
  session: ConversationSession,
  transcript: string,
  start: number,
): Promise<VoiceTurnResult> {
  const settings = getSettings();
  const userTurn = addTurn({ role: 'user', text: transcript });
  const speech = 'Evet Emir?';
  const apexTurn = addTurn({ role: 'apex', text: speech, intent: 'wake.greeting' });
  transitionState('speaking');
  const tts = await synthesize({
    text: speech,
    language: settings.language,
    gender: settings.gender,
  });
  refreshFollowUp();
  transitionState('idle');
  recordResponseTime(Math.round(performance.now() - start));
  void session;
  return {
    session: getCurrentSession()!,
    userTurn,
    apexTurn,
    tts,
    requiresApproval: false,
    intent: 'wake.greeting',
    followUpActive: true,
  };
}

function buildInterruptResult(session: ConversationSession, transcript: string): VoiceTurnResult {
  const userTurn = addTurn({ role: 'user', text: transcript });
  const apexTurn = addTurn({ role: 'apex', text: '', intent: 'interrupt' });
  return {
    session: getCurrentSession() ?? session,
    userTurn,
    apexTurn,
    tts: {
      text: '',
      language: getSettings().language,
      gender: getSettings().gender,
      voiceId: '',
      provider: 'client-synthesis',
      durationMs: 0,
    },
    requiresApproval: false,
    intent: 'interrupt',
    followUpActive: isFollowUpActive(),
  };
}

function buildNoWakeResult(session: ConversationSession, transcript: string): VoiceTurnResult {
  return {
    session,
    userTurn: {
      id: crypto.randomUUID(),
      role: 'user',
      text: transcript,
      createdAt: new Date().toISOString(),
    },
    apexTurn: {
      id: crypto.randomUUID(),
      role: 'apex',
      text: '',
      intent: 'no-wake',
      createdAt: new Date().toISOString(),
    },
    tts: {
      text: '',
      language: getSettings().language,
      gender: getSettings().gender,
      voiceId: '',
      provider: 'client-synthesis',
      durationMs: 0,
    },
    requiresApproval: false,
    intent: 'no-wake',
    followUpActive: false,
  };
}

/** Ham transkript → STT normalize (mevcut STT registry) → tur işle. */
export async function processAudioTurn(input: {
  transcript?: string;
  audioRef?: string;
  requireWake?: boolean;
}): Promise<VoiceTurnResult> {
  const settings = getSettings();
  const stt = await transcribe({
    transcript: input.transcript,
    audioRef: input.audioRef,
    language: settings.language,
  });
  return processConversationTurn({ transcript: stt.text, requireWake: input.requireWake });
}
