import type { VoiceStatus, VoiceSettings, ConversationSession, VoiceTurnResult } from '../types';
import {
  getCurrentSession,
  startVoice,
  stopVoice,
  getSettings,
  updateSettings,
  getMicPermission,
  setMicPermission,
  getAverageResponseMs,
  getTotalTurns,
  getArchivedSessions,
  checkFollowUpTimeout,
  isFollowUpActive,
  interrupt,
} from '../voice-session';
import { processConversationTurn, processAudioTurn } from '../conversation-engine';
import {
  listSttProviders,
  getActiveSttProvider,
  setActiveSttProvider,
  getSttCapabilities,
} from '../stt-registry';
import {
  listTtsProviders,
  getActiveTtsProvider,
  setActiveTtsProvider,
  getTtsVoices,
} from '../tts-registry';
import { getWakeWordDetectorName } from '../wake-word';

/**
 * Voice AI Service — mobil-hazır facade. Yalnız düz JSON döner; framework tipi
 * sızmaz. iPhone/Android/Apple Watch/Wear OS aynı servisi kullanır. Ham audio
 * DSP+STT+TTS istemci native; bu katman orkestrasyonu yapar.
 */

export function voiceStart(
  language?: 'tr' | 'en',
  gender?: 'male' | 'female',
): ConversationSession {
  return startVoice(language, gender);
}

export function voiceStop(): ConversationSession | null {
  return stopVoice();
}

export function voiceInterrupt(): ConversationSession | null {
  return interrupt();
}

export async function voiceProcess(input: {
  transcript: string;
  requireWake?: boolean;
}): Promise<VoiceTurnResult> {
  return processConversationTurn(input);
}

export async function voiceProcessAudio(input: {
  transcript?: string;
  audioRef?: string;
  requireWake?: boolean;
}): Promise<VoiceTurnResult> {
  return processAudioTurn(input);
}

export function voiceSettings(): VoiceSettings {
  return getSettings();
}

export function voiceUpdateSettings(patch: Partial<VoiceSettings>): VoiceSettings {
  const next = updateSettings(patch);
  if (patch.sttProvider) setActiveSttProvider(patch.sttProvider);
  if (patch.ttsProvider) setActiveTtsProvider(patch.ttsProvider);
  return next;
}

export function voiceProviders(): {
  stt: { active: string; available: string[]; capabilities: ReturnType<typeof getSttCapabilities> };
  tts: { active: string; available: string[]; voices: ReturnType<typeof getTtsVoices> };
  wakeWord: string;
} {
  return {
    stt: {
      active: getActiveSttProvider(),
      available: listSttProviders(),
      capabilities: getSttCapabilities(),
    },
    tts: { active: getActiveTtsProvider(), available: listTtsProviders(), voices: getTtsVoices() },
    wakeWord: getWakeWordDetectorName(),
  };
}

export function voiceStatus(): VoiceStatus {
  checkFollowUpTimeout(); // lazy timeout kontrolü — poll yok
  const session = getCurrentSession();
  const settings = getSettings();
  return {
    state: session?.state ?? 'sleeping',
    active: session?.active ?? false,
    micPermission: getMicPermission(),
    wakeCount: session?.wakeCount ?? 0,
    totalTurns: getTotalTurns(),
    averageResponseMs: getAverageResponseMs(),
    sttProvider: getActiveSttProvider(),
    ttsProvider: getActiveTtsProvider(),
    sttProvidersAvailable: listSttProviders(),
    ttsProvidersAvailable: listTtsProviders(),
    wakeWordEnabled: settings.wakeWordEnabled,
    cpuFriendly: true,
    listeningIndicator: session?.state === 'listening',
    followUpActive: isFollowUpActive(),
    generatedAt: new Date().toISOString(),
  };
}

export function voiceCurrentConversation(): ConversationSession | null {
  return getCurrentSession();
}

export function voiceHistory(limit = 10): ConversationSession[] {
  return getArchivedSessions(limit);
}

export { setMicPermission };
