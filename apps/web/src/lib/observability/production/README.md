# Production Hardening Final (Sprint 24)

APEX'i **7/24 production** seviyesine getiren denetim katmanı. **Yeni özellik YOK** — mevcut observability (getMetrics/health/security-audit/checklist), cache, cloud-backup, agent-store, notification altyapısını DENETLER + aggregate eder.

## Modüller (`apps/web/src/lib/observability/production/`)

| Modül                            | Sorumluluk                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                       | Framework-bağımsız audit tipleri                                                                                                                                     |
| `stability-audit.ts`             | Ring buffer/TTL cache/globalThis singleton envanteri + canlı boyut ihlali (leak sinyali). 18 bounded buffer doğrulanır                                               |
| `recovery-verify.ts`             | Crash recovery — agent/workflow/queue/trading/commerce/sync restart'ta devam edebilir mi (globalThis + backup + pending queue)                                       |
| `performance-audit.ts`           | RAM/CPU/Event Loop/GC baskısı/Cache hit ratio/API latency — getMetrics().getProcessMetrics/getPercentiles reuse                                                      |
| `load-test.ts`                   | Gerçek in-process yük — production yollarını (Trading/Commerce/Voice/Sync/Dashboard) N iterasyon benchmark (p50/p95/p99 + ops/sn)                                    |
| `backup-verify.ts`               | Cloud backup gerçekten oluşuyor + restore çalışıyor mu (cloud-backup reuse, mock yok)                                                                                |
| `production-health.ts`           | Monitoring dashboard aggregate — CPU/RAM/EventLoop/Queue/Cache/Plugin/Cloud/Trading/Commerce/Voice                                                                   |
| `alert-engine.ts`                | Kritik eşikler (crash/memory/queue/trading/sync/event-loop) → **mevcut routeNotification REUSE** (Discord/Telegram/Email + saat/telefon). Yeni bildirim sistemi YOK  |
| `rc-score.ts`                    | Release Candidate Score 0-100 — 7 kriter (stability/performance/security/recovery/monitoring/testCoverage/productionReadiness). security-audit/checklist/audit reuse |
| `services/production-service.ts` | Düz JSON facade — TTL cache; 6 API route `/api/system/*`                                                                                                             |

## Kurallar

- **Yeni modül/özellik geliştirme yasak** — yalnız stabilite/performans/güvenlik/recovery/monitoring.
- Mevcut altyapı yeniden yazılmaz; audit'ler mevcut store/metrics/cache'i OKUR.
- Alert Engine mevcut notification altyapısını reuse eder (yeni bildirim sistemi yasak).
- Sorun bulunursa gizlenmez — `rc-score.knownIssues` içinde raporlanır.

## API

`/api/system/{production,load,stability,recovery,backup-test,rc}` — Zod + `withErrorBoundary`.
