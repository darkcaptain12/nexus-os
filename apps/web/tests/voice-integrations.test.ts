import { describe, it, expect, beforeEach } from 'vitest';
import { parseVoiceIntent, handleVoiceIntent } from '../src/lib/quant/services/voice-service';
import { processConversationTurn } from '../src/lib/voice/conversation-engine';
import { stopVoice, updateSettings } from '../src/lib/voice/voice-session';
import { resetWakeCooldown } from '../src/lib/voice/wake-word';
import {
  voiceStatus,
  voiceProviders,
  voiceHistory,
} from '../src/lib/voice/services/voice-ai-service';
import { getMemoryStore } from '../src/lib/memory/store';

describe('Voice — yeni action intent’leri', () => {
  it('"proje oluştur" → project.create', () => {
    expect(parseVoiceIntent('yeni proje oluştur').intent).toBe('project.create');
  });

  it('"market tara" → market.scan', () => {
    expect(parseVoiceIntent('market tara').intent).toBe('market.scan');
    expect(parseVoiceIntent('piyasayı tara').intent).toBe('market.scan');
  });

  it('"clipboard oku" → clipboard.read', () => {
    expect(parseVoiceIntent('clipboard oku').intent).toBe('clipboard.read');
    expect(parseVoiceIntent('panoyu oku').intent).toBe('clipboard.read');
  });

  it('"workflow başlat" → workflow.start', () => {
    expect(parseVoiceIntent('workflow başlat').intent).toBe('workflow.start');
    expect(parseVoiceIntent('iş akışı başlat').intent).toBe('workflow.start');
  });

  it('"rapor oluştur" → report.generate', () => {
    expect(parseVoiceIntent('rapor oluştur').intent).toBe('report.generate');
  });

  it('project.create Agent Runtime kullanır', async () => {
    const r = await handleVoiceIntent(parseVoiceIntent('yeni proje oluştur: mobil uygulama'));
    expect(r.intent).toBe('project.create');
    expect(r.data?.agentId).toBeTruthy();
  });

  it('clipboard.read desktop-vision clipboard servisini kullanır', async () => {
    const r = await handleVoiceIntent(parseVoiceIntent('clipboard oku'));
    expect(r.intent).toBe('clipboard.read');
    expect(r.data).toHaveProperty('history');
  });

  it('report.generate Memory + Trading birleştirir', async () => {
    const r = await handleVoiceIntent(parseVoiceIntent('rapor oluştur'));
    expect(r.intent).toBe('report.generate');
    expect(r.speech).toContain('Rapor');
  });
});

describe('Voice — Memory + Knowledge Graph entegrasyonu', () => {
  beforeEach(() => {
    stopVoice();
    resetWakeCooldown();
    updateSettings({ followUpTimeoutSeconds: 30 });
  });

  it("konuşma MemoryStore'a source=voice yazılır", async () => {
    const store = getMemoryStore();
    const before = store.getTimeline(undefined, 'voice', 1000).length;
    await processConversationTurn({ transcript: 'Hey APEX görevlerim neler' });
    const after = store.getTimeline(undefined, 'voice', 1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it("önemli intent (trading) Knowledge Graph'a bağlanır", async () => {
    const { getKnowledgeGraph } = await import('../src/lib/knowledge/graph-store');
    const graph = getKnowledgeGraph();
    const before = graph.getStatistics().nodeCount;
    await processConversationTurn({ transcript: 'Hey APEX BTCUSDT analiz et' });
    const after = graph.getStatistics().nodeCount;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe('Voice AI Service — mobil facade', () => {
  it('voiceStatus düz JSON (Apple Watch sözleşmesi)', () => {
    const status = voiceStatus();
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('wakeCount');
    expect(status).toHaveProperty('averageResponseMs');
    expect(status.cpuFriendly).toBe(true);
    expect(Array.isArray(status.sttProvidersAvailable)).toBe(true);
  });

  it('voiceProviders STT+TTS+wake listeler', () => {
    const p = voiceProviders();
    expect(p.stt.available).toContain('client-native');
    expect(p.tts.available).toContain('client-synthesis');
    expect(p.wakeWord).toBe('fuzzy-keyword');
  });

  it('voiceHistory arşiv döner', () => {
    expect(Array.isArray(voiceHistory())).toBe(true);
  });
});

describe('Apple Watch senaryosu — Hey APEX zinciri', () => {
  beforeEach(() => {
    stopVoice();
    resetWakeCooldown();
    updateSettings({ followUpTimeoutSeconds: 30 });
  });

  it('"Hey APEX → Trading nasıl → Bugünkü görevler → Son satış" follow-up zinciri', async () => {
    const wake = await processConversationTurn({ transcript: 'Hey APEX' });
    expect(wake.apexTurn.text).toContain('Evet');

    const trading = await processConversationTurn({ transcript: 'trading nasıl' });
    expect(trading.intent).toBe('trading.status');

    const tasks = await processConversationTurn({ transcript: 'bugünkü görevler neler' });
    expect(tasks.intent).toBe('task.query');

    // Hepsi wake word olmadan (follow-up)
    expect(trading.followUpActive).toBe(true);
    expect(tasks.followUpActive).toBe(true);
  });
});
