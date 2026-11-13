# APEX OS v1.0 Release (Sprint 25)

v1.0 production release hazırlık katmanı. **Yeni özellik YOK** — mevcut config/env-validation/cloud-backup/production-service/security-audit/Memory/KG altyapısını release için sarar + aggregate eder.

## Modüller (`apps/web/src/lib/release/`)

| Modül                         | Sorumluluk                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                    | Framework-bağımsız release tipleri                                                                                                                                |
| `version-manager.ts`          | v1.0.0 / build number / release date / commit / migration version (19)                                                                                            |
| `environment-validation.ts`   | Node/PNPM/DB/API keys/env/SSL/memory/network — mevcut validateEnvironment reuse; blockers raporu                                                                  |
| `config-manager.ts`           | Tek merkez: 10 provider (secret DEĞER dönmez, set/unset) + feature flags + security. getAppConfig reuse                                                           |
| `installation-wizard.ts`      | 8 kurulum adımı durumu (Supabase zorunlu, kalanlar opsiyonel graceful)                                                                                            |
| `backup-export.ts`            | GERÇEK export/import — Memory/KG/Commerce/Trading/Workflow/Plugins/Settings serialize + checksum                                                                  |
| `changelog-generator.ts`      | Sprint 1-25 özeti (yeni modül/iyileştirme/hardening)                                                                                                              |
| `documentation-audit.ts`      | fs ile gerçek doküman varlık kontrolü; eksikler raporlanır                                                                                                        |
| `release-audit.ts`            | Tam entegrasyon smoke test — 9 subsystem instantiate + gerçek veri döner mi                                                                                       |
| `production-score.ts`         | FINAL 9 kriter → 0-100 (stability/security/performance/recovery/documentation/monitoring/installation/configuration/testCoverage). RC score + release audit reuse |
| `services/release-service.ts` | Düz JSON facade; TTL cache. 6 API route `/api/system/*`                                                                                                           |

## Kurallar

- **Yeni özellik/modül geliştirme YASAK** — yalnız v1.0 release hazırlığı.
- Mevcut altyapı yeniden yazılmaz; release araçları mevcut store/config/audit'i OKUR.
- Sorunlar gizlenmez — `productionScore.knownIssues` + `operationalRequirements` (kod dışı API key vb).
- Export gerçek veri serialize eder (mock yok), checksum ile doğrulanır.

## API

`/api/system/{release,version,changelog,config,environment,install}` — Zod + `withErrorBoundary`.

## Release Package

Repo kökünde: `CHANGELOG.md`, `LICENSE`, `.env.example`, `docs/MIGRATION.md`, `docs/installation.md`.
