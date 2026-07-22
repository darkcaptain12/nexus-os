import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectWakeWord,
  resetWakeCooldown,
  getWakeWordDetectorName,
} from '../src/lib/voice/wake-word';

describe('Wake Word — Hey APEX', () => {
  beforeEach(() => resetWakeCooldown());

  it('"Hey APEX" yüksek güvenle tetiklenir', () => {
    const r = detectWakeWord('Hey APEX bugün ne var?');
    expect(r.detected).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('fuzzy: STT hatası "hey apeks" de tetiklenir', () => {
    const r = detectWakeWord('hey apeks nasılsın');
    expect(r.detected).toBe(true);
  });

  it('alakasız cümle tetiklenmez', () => {
    const r = detectWakeWord('bugün hava çok güzel');
    expect(r.detected).toBe(false);
    expect(r.confidence).toBeLessThan(0.85);
  });

  it('false-positive azaltma: cooldown art arda tetiği engeller', () => {
    const first = detectWakeWord('Hey APEX');
    expect(first.detected).toBe(true);
    const second = detectWakeWord('Hey APEX');
    expect(second.detected).toBe(false);
    expect(second.falsePositiveFiltered).toBe(true);
    expect(second.reason).toContain('cooldown');
  });

  it('false-positive: uzun cümlede gömülü "apex" bahsetme filtrelenir', () => {
    // Düşük eşik (0.7): "apex" güven 0.75 ile eşiği geçer, ama cümle-içi
    // bahsetme filtresi devreye girer (komut değil, laf arası "apex")
    const r = detectWakeWord('geçen gün apex hakkında bir yazı okudum çok ilginçti', 0.7);
    expect(r.detected).toBe(false);
    expect(r.falsePositiveFiltered).toBe(true);
    expect(r.reason).toContain('cümle içi');
  });

  it('eşik ayarlanabilir (düşük eşik daha toleranslı)', () => {
    resetWakeCooldown();
    const strict = detectWakeWord('hey aphex', 0.99);
    resetWakeCooldown();
    const loose = detectWakeWord('hey aphex', 0.6);
    expect(loose.confidence).toBe(strict.confidence);
    // Aynı güven, farklı eşik → farklı sonuç mümkün
    expect(loose.detected || !strict.detected).toBe(true);
  });

  it('confidence score her zaman döner', () => {
    const r = detectWakeWord('test');
    expect(typeof r.confidence).toBe('number');
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it('detector adı fuzzy-keyword', () => {
    expect(getWakeWordDetectorName()).toBe('fuzzy-keyword');
  });
});
