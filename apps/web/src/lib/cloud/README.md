# Cloud Sync + Multi Device (Sprint 22)

Tek kullanıcı, birden fazla cihaz (Mac/Windows/iPhone/iPad/Apple Watch/Android/Wear OS/Web) — hepsi aynı APEX beynini paylaşır. Katman **orkestrasyon**dur: mevcut Mobile (device-registry/sync-client/offline-store/notification-center), Memory, Knowledge Graph ve Auth altyapısını REUSE eder.

## Modüller

| Modül                       | Sorumluluk                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                  | Framework-bağımsız tipler (mobil/watch sözleşmesi)                                                                  |
| `device-manager.ts`         | Register/Pair/Verify/Rename/Disable/Remove/Trust/Health — mobil platformlar mevcut mobile registry'ye de kaydedilir |
| `sync-engine.ts`            | Sync Engine v2 — delta sync (yalnız değişen veri), versiyon sayacı, incremental pull cursor'ı, 11 domain            |
| `conflict-resolver.ts`      | LWW (varsayılan) / Merge (settings/memory/notifications) / Manual Review (trading/commerce/executive)               |
| `offline-queue.ts`          | Retry + exponential backoff + content-hash duplicate prevention                                                     |
| `presence-engine.ts`        | Online/Offline/Idle/Busy/Sleeping — heartbeat'ten türetme, poll YOK                                                 |
| `device-intelligence.ts`    | CPU/RAM/Storage/Network/Battery → health skoru (0-100) + sync lag                                                   |
| `notification-router.ts`    | Kural tablosu: approval→telefon, critical risk→saat, desktop→Mac/Windows; push üretimi notification-center reuse    |
| `handoff-engine.ts`         | Session continuity — Voice/Agent/Executive/Workflow/Commerce/Trading context devri (TTL 5 dk)                       |
| `cloud-backup.ts`           | Memory/KG/Tasks/Projects/Plugins/Settings — version history, gerçek item sayıları                                   |
| `cloud-security.ts`         | Device trust/revocation, session revocation, remote logout, push token rotation, encryption metadata                |
| `services/cloud-service.ts` | Düz JSON facade — mobil/watch/dashboard sözleşmesi                                                                  |

## Kurallar

- Cihaz kaydı → Knowledge Graph `recordDevice` (User→Device zinciri); handoff → `recordHandoff`.
- Delta sync zorunlu: full snapshot taşınmaz, yalnız cursor sonrası deltalar.
- Kritik domain conflict'leri (trading/commerce/executive) asla otomatik ezilmez → manuel kuyruk.
- Revoke edilen cihaz sync/push alamaz; oturumları kapanır, push token silinir.
- Event-driven: cihaz heartbeat/presence/vitals gönderir, server poll yapmaz.
- Ring buffer'lar her yerde — memory leak yok.

## API

`/api/cloud/{devices,sync,backup,presence,conflicts,handoff,status,security,history}` — hepsi Zod + `withErrorBoundary`.
