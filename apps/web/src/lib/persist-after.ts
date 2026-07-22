import { after } from 'next/server';

// Serverless-safe write-through defer. Vercel/Next `after()` promise'i response
// GÖNDERİLDİKTEN sonra çalıştırır (waitUntil) — fire-and-forget'in kısa request'te
// kesilme sorununu çözer. Request context dışında (test/background) fallback:
// promise'i normal başlat.

export function deferPersist(fn: () => Promise<unknown>): void {
  try {
    after(async () => {
      try {
        await fn();
      } catch {
        // kalıcılık best-effort — globalThis fallback zaten var
      }
    });
  } catch {
    // after() request context dışında çağrıldı (test/script) → doğrudan başlat
    void fn().catch(() => {});
  }
}
