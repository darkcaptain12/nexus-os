# Mobile Platform v1.0 (Sprint 18)

Tek kod tabanından iPhone/iPad/Android/Apple Watch/Wear OS. Mobil katman
**FACADE'dir**: mevcut servisleri (Executive/Agent/Voice/Desktop/Knowledge/
Trading/Commerce) aggregate eder. Yeni iş mantığı YOK, duplicate logic YOK.

## Modüller (`src/lib/mobile/`)

| Dosya                        | Görev                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `types.ts`                   | Framework-bağımsız tipler (device/push/dashboard/widget/wearable/offline/sync)                      |
| `device-registry.ts`         | Bağlı cihazlar, heartbeat, batarya, online (ring buffer, event-driven)                              |
| `notification-center.ts`     | Push engine: 8 kategori (Trading/Commerce/Agent/Desktop/Memory/Workflow/Approval/Risk), ring buffer |
| `offline-store.ts`           | Offline snapshot cache + mutation kuyruğu (offline-first)                                           |
| `sync-client.ts`             | Conflict resolution (last-write-wins/server-wins/client-wins), kuyruk merge                         |
| `background-service.ts`      | Event-driven arka plan sync + Mobile System Health                                                  |
| `mobile-runtime.ts`          | Home Dashboard / Approval Center / Trading / Desktop Companion aggregation (reuse)                  |
| `widget-provider.ts`         | iOS (Small/Medium/Large/Lock) + Android (Material) widget verisi                                    |
| `wearable-provider.ts`       | Apple Watch / Wear OS (Executive/Trading/Approval/Tasks/Voice/Notifications)                        |
| `services/mobile-service.ts` | Ana facade — düz JSON, framework-bağımsız                                                           |

## Reuse (yeniden yazılmayan servisler)

- Executive: `getExecutiveDashboard`, `getStateMachine`
- Agent Runtime: `getAgentStore`
- Approval: `getApprovalQueue` + Action Engine `approvals`
- Desktop Intelligence: `getDesktopIntelligenceContext`
- Knowledge Graph: `getKnowledgeGraph().getStatistics()` → memoryHealth
- Trading: `getTradingStatusSummary`, `getPortfolioOverview`
- Commerce: `getCommerceOverview` (migration 009 üstünde yeni gerçek okuma servisi)
- Voice: `voiceStatus`
- Auth: Supabase (biyometrik FaceID/TouchID/Passkey istemci Secure Enclave)

## API (8 uç `/api/mobile`)

`` (auth caps), dashboard (home/approvals/trading/commerce/desktop/offline), devices (GET+register+heartbeat), sync (POST sync/enqueue, PUT background), widgets, watch, notifications (GET+push), status

## Performans

Event-driven (istemci heartbeat/BackgroundTasks tetikler, server poll YOK). Offline-first (her build cache tazeler). Ring buffer'lar (50 cihaz/200 push/500 mutation) — memory leak yok.
