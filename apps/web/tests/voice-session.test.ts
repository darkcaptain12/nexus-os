import { describe, it, expect, beforeEach } from 'vitest';
import {
  startVoice,
  stopVoice,
  getCurrentSession,
  wake,
  addTurn,
  transitionState,
  isFollowUpActive,
  refreshFollowUp,
  updateSettings,
  interrupt,
  getTotalTurns,
  recordResponseTime,
  getAverageResponseMs,
} from '../src/lib/voice/voice-session';

describe('Voice Session — state machine', () => {
  beforeEach(() => {
    stopVoice();
    updateSettings({ followUpTimeoutSeconds: 30 });
  });

  it('startVoice sleeping durumunda başlar', () => {
    const s = startVoice();
    expect(s.state).toBe('sleeping');
    expect(s.active).toBe(true);
    expect(s.wakeCount).toBe(0);
  });

  it('wake → listening + wakeCount artar + follow-up başlar', () => {
    startVoice();
    const s = wake();
    expect(s!.state).toBe('listening');
    expect(s!.wakeCount).toBe(1);
    expect(isFollowUpActive()).toBe(true);
  });

  it('state geçişleri çalışır', () => {
    startVoice();
    expect(transitionState('thinking')!.state).toBe('thinking');
    expect(transitionState('speaking')!.state).toBe('speaking');
    expect(transitionState('idle')!.state).toBe('idle');
  });

  it('follow-up penceresi süre dolunca kapanır', () => {
    startVoice();
    updateSettings({ followUpTimeoutSeconds: 30 });
    wake();
    expect(isFollowUpActive()).toBe(true);
    // Süreyi geçmişe al
    const s = getCurrentSession()!;
    s.followUpExpiresAt = new Date(Date.now() - 1000).toISOString();
    expect(isFollowUpActive()).toBe(false);
  });

  it('interrupt: speaking → idle (follow-up korunur)', () => {
    startVoice();
    wake();
    transitionState('speaking');
    const s = interrupt();
    expect(s!.state).toBe('idle');
  });

  it('addTurn tur ekler + ring buffer', () => {
    startVoice();
    addTurn({ role: 'user', text: 'merhaba' });
    addTurn({ role: 'apex', text: 'Evet Emir?' });
    expect(getCurrentSession()!.turns.length).toBe(2);
  });

  it('addTurn oturum yoksa fırlatır', () => {
    stopVoice();
    expect(() => addTurn({ role: 'user', text: 'x' })).toThrow();
  });

  it('stopVoice oturumu arşivler', () => {
    startVoice();
    addTurn({ role: 'user', text: 'test' });
    const stopped = stopVoice();
    expect(stopped!.active).toBe(false);
    expect(getCurrentSession()).toBeNull();
  });

  it('getTotalTurns current + archived toplar', () => {
    stopVoice();
    startVoice();
    addTurn({ role: 'user', text: 'a' });
    stopVoice();
    startVoice();
    addTurn({ role: 'user', text: 'b' });
    expect(getTotalTurns()).toBeGreaterThanOrEqual(2);
  });

  it('response time ortalaması', () => {
    recordResponseTime(100);
    recordResponseTime(200);
    expect(getAverageResponseMs()).toBeGreaterThan(0);
  });

  it('refreshFollowUp süreyi uzatır', () => {
    startVoice();
    wake();
    const before = getCurrentSession()!.followUpExpiresAt;
    refreshFollowUp();
    const after = getCurrentSession()!.followUpExpiresAt;
    expect(new Date(after!).getTime()).toBeGreaterThanOrEqual(new Date(before!).getTime());
  });
});
