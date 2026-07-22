import { describe, it, expect } from 'vitest';
import { parseVoiceIntent, handleVoiceIntent } from '../src/lib/quant/services/voice-service';

describe('Voice Service — intent parsing', () => {
  it('görev oluşturma intenti', () => {
    const intent = parseVoiceIntent('yeni görev oluştur: raporu bitir');
    expect(intent.intent).toBe('task.create');
    expect(intent.confidence).toBeGreaterThan(0.5);
  });

  it('görev sorgulama intenti', () => {
    expect(parseVoiceIntent('görevlerim neler').intent).toBe('task.query');
    expect(parseVoiceIntent('bekleyen görevleri göster').intent).toBe('task.query');
  });

  it('proje durumu intenti', () => {
    expect(parseVoiceIntent('projelerimin durumu ne').intent).toBe('project.status');
  });

  it('trading durumu intenti', () => {
    expect(parseVoiceIntent('portföyüm nasıl').intent).toBe('trading.status');
    expect(parseVoiceIntent('kâr zarar durumu').intent).toBe('trading.status');
  });

  it('sembol analizi intenti sembolü çıkarır', () => {
    const intent = parseVoiceIntent('BTCUSDT analiz et');
    expect(intent.intent).toBe('trading.analysis');
    expect(intent.params.symbol).toBe('BTCUSDT');
  });

  it('anlaşılmayan metin unknown döner', () => {
    const intent = parseVoiceIntent('xyzqwerty lorem ipsum');
    expect(intent.intent).toBe('unknown');
    expect(intent.confidence).toBe(0);
  });
});

describe('Voice Service — intent handling', () => {
  it('task.create agent oluşturur ve agentId döner', async () => {
    const response = await handleVoiceIntent({
      intent: 'task.create',
      confidence: 0.9,
      params: { goal: 'Bildirim gönder' },
      rawText: 'yeni görev oluştur',
    });
    expect(response.intent).toBe('task.create');
    expect(response.data?.agentId).toBeTruthy();
    expect(response.speech).toContain('adım');
  });

  it('trading.analysis agent oluşturur ve onay bildirir', async () => {
    const response = await handleVoiceIntent({
      intent: 'trading.analysis',
      confidence: 0.9,
      params: { symbol: 'ETHUSDT' },
      rawText: 'ETHUSDT analiz et',
    });
    expect(response.requiresApproval).toBe(true);
    expect(response.data?.symbol).toBe('ETHUSDT');
    expect(response.speech).toContain('ETHUSDT');
  });

  it('project.status memory istatistikleri döner', async () => {
    const response = await handleVoiceIntent({
      intent: 'project.status',
      confidence: 0.9,
      params: {},
      rawText: 'proje durumu',
    });
    expect(response.speech).toContain('proje');
    expect(response.data).not.toBeNull();
  });

  it('unknown yardım mesajı döner', async () => {
    const response = await handleVoiceIntent({
      intent: 'unknown',
      confidence: 0,
      params: {},
      rawText: '???',
    });
    expect(response.speech).toContain('anlayamadım');
    expect(response.requiresApproval).toBe(false);
  });
});
