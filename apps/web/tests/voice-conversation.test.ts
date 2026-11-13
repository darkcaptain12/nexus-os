import { describe, it, expect, beforeEach } from 'vitest';
import { processConversationTurn } from '../src/lib/voice/conversation-engine';
import { stopVoice, startVoice, updateSettings } from '../src/lib/voice/voice-session';
import { resetWakeCooldown } from '../src/lib/voice/wake-word';

describe('Conversation Engine — doğal konuşma', () => {
  beforeEach(() => {
    stopVoice();
    resetWakeCooldown();
    updateSettings({ followUpTimeoutSeconds: 30, wakeConfidenceThreshold: 0.85 });
  });

  it('"Hey APEX" → uyanır, "Evet Emir?" der', async () => {
    const r = await processConversationTurn({ transcript: 'Hey APEX' });
    expect(r.apexTurn.text).toContain('Evet Emir');
    expect(r.followUpActive).toBe(true);
  });

  it('"Hey APEX bugün ne var" → wake + intent tek turda', async () => {
    const r = await processConversationTurn({ transcript: 'Hey APEX görevlerim neler' });
    expect(r.intent).toBe('task.query');
    expect(r.apexTurn.text.length).toBeGreaterThan(5);
  });

  it('follow-up: wake word olmadan devam (2. tur)', async () => {
    await processConversationTurn({ transcript: 'Hey APEX' });
    // Follow-up aktif — wake gerekmez
    const r2 = await processConversationTurn({ transcript: 'portföyüm nasıl' });
    expect(r2.intent).toBe('trading.status');
  });

  it('wake word olmadan (follow-up yokken) sessiz kalır', async () => {
    stopVoice();
    resetWakeCooldown();
    startVoice();
    const r = await processConversationTurn({ transcript: 'görevlerim neler' });
    expect(r.intent).toBe('no-wake');
    expect(r.apexTurn.text).toBe('');
  });

  it('"dur" → interrupt', async () => {
    await processConversationTurn({ transcript: 'Hey APEX' });
    const r = await processConversationTurn({ transcript: 'dur' });
    expect(r.intent).toBe('interrupt');
  });

  it('riskli komut (trading) requiresApproval döner', async () => {
    resetWakeCooldown();
    const r = await processConversationTurn({ transcript: 'Hey APEX BTCUSDT analiz et' });
    expect(r.intent).toBe('trading.analysis');
    expect(r.requiresApproval).toBe(true);
  });

  it("goodbye → oturum sleeping'e döner", async () => {
    await processConversationTurn({ transcript: 'Hey APEX' });
    const r = await processConversationTurn({ transcript: 'tamam teşekkürler' });
    expect(r.apexTurn.text).toContain('Görüşmek üzere');
  });

  it('TTS cevap üretilir', async () => {
    const r = await processConversationTurn({ transcript: 'Hey APEX görevlerim neler' });
    expect(r.tts.text.length).toBeGreaterThan(0);
    expect(r.tts.voiceId).toBe('tr-female');
  });

  it('follow-up zincir: birden çok tur wake word olmadan', async () => {
    await processConversationTurn({ transcript: 'Hey APEX' });
    const r1 = await processConversationTurn({ transcript: 'bugünkü görevler' });
    const r2 = await processConversationTurn({ transcript: 'trading nasıl gidiyor' });
    expect(r1.intent).toBe('task.query');
    expect(r2.intent).toBe('trading.status');
    expect(r2.followUpActive).toBe(true);
  });
});
