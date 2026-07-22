import { describe, it, expect } from 'vitest';
import {
  containsSensitiveData,
  maskSensitiveData,
  getSensitivePatternNames,
} from '../src/privacy/sanitizer';

describe('Privacy Sanitizer', () => {
  it('detects API keys', () => {
    expect(containsSensitiveData('api_key: sk-abcdef1234567890')).toBe(true);
  });

  it('detects bearer tokens', () => {
    expect(containsSensitiveData('Authorization: Bearer abc123def456ghi789')).toBe(true);
  });

  it('detects JWT', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dQw4w9WgXcQ_dQw4w9WgXcQdQw4w9WgXcQ';
    expect(containsSensitiveData(jwt)).toBe(true);
  });

  it('detects passwords', () => {
    expect(containsSensitiveData('password=hunter2secret')).toBe(true);
  });

  it('detects IBAN', () => {
    expect(containsSensitiveData('TR330006100519786457841326')).toBe(true);
  });

  it('detects TC Kimlik', () => {
    expect(containsSensitiveData('TC: 12345678901')).toBe(true);
  });

  it('detects SSH private keys', () => {
    expect(
      containsSensitiveData(
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----',
      ),
    ).toBe(true);
  });

  it('detects credit card numbers', () => {
    expect(containsSensitiveData('4111 1111 1111 1111')).toBe(true);
  });

  it('returns false for normal text', () => {
    expect(containsSensitiveData('main.ts — APEX-OS — Visual Studio Code')).toBe(false);
  });

  it('masks sensitive content', () => {
    const masked = maskSensitiveData('api_key: sk-abcdef1234567890');
    expect(masked).toContain('[REDACTED:API_KEY]');
    expect(masked).not.toContain('sk-abcdef1234567890');
  });

  it('masks multiple sensitive patterns in one string', () => {
    const masked = maskSensitiveData('password=secret123 and Bearer abc123def456ghi789');
    expect(masked).not.toContain('secret123');
    expect(masked).not.toContain('abc123def456ghi789');
  });

  it('leaves normal text untouched', () => {
    const text = 'main.ts — APEX-OS';
    expect(maskSensitiveData(text)).toBe(text);
  });

  it('exposes pattern names', () => {
    const names = getSensitivePatternNames();
    expect(names).toContain('API_KEY');
    expect(names).toContain('JWT');
    expect(names).toContain('SSH_KEY');
    expect(names).toContain('IBAN');
    expect(names).toContain('TC_KIMLIK');
    expect(names).toContain('CREDIT_CARD');
    expect(names).toContain('PASSWORD');
    expect(names).toContain('SECRET');
    expect(names).toContain('COOKIE');
    expect(names).toContain('BEARER_TOKEN');
  });
});
