# Developer Platform v1.0 — Plugin SDK + Marketplace + Public API (Sprint 21)

APEX artık genişletilebilir platform. 3. parti geliştiriciler plugin yazar, API
kullanır, Marketplace'ten yayınlar. Mevcut Integration Hub + Registry + OAuth
mimarisi REUSE eder — duplicate yok.

## Modüller (`src/lib/plugins/`)

| Dosya                                    | Görev                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-registry.ts`                     | Kurulu pluginler (globalThis registry pattern) + manifest doğrulama                                                              |
| `permission-engine.ts`                   | 9 izin (trading/commerce/desktop/voice/filesystem/clipboard/notifications/workflow/network). İzinsiz erişim YOK                  |
| `plugin-context.ts`                      | Public SDK yüzeyi — izin-kontrollü wrapper'lar (Executive/Memory/KG/Agent/Workflow/Trading/Commerce/Desktop/Voice/Notifications) |
| `plugin-sandbox.ts`                      | Plugin izolasyonu — yalnız context erişilir, hata diğerlerini etkilemez                                                          |
| `plugin-lifecycle.ts`                    | install/enable/disable/update/uninstall/health/reload                                                                            |
| `event-hooks.ts`                         | 10 event (task.created…desktop.activity). Modüller emitHook, pluginler subscribe                                                 |
| `marketplace.ts`                         | Install/Remove/Update/Rating/Reviews/Downloads/Categories/Search + 12 official plugin (WooCommerce/Discord/Stripe/PayTR/…)       |
| `webhooks.ts`                            | Incoming/Outgoing/Retry/Signature/Secret/Replay Protection                                                                       |
| `plugin-oauth.ts`                        | OAuth2/OpenID/PKCE — mevcut integrations/oauth REUSE                                                                             |
| `services/developer-platform-service.ts` | Facade + Developer Dashboard                                                                                                     |

## Güvenlik

- Plugin sisteme DOĞRUDAN erişemez — yalnız Plugin Context (izin-kontrollü)
- İzin manifest'te talep edilmeli + kullanıcı grant'i olmalı; disabled plugin erişemez
- Sandbox: izin ihlali PermissionDeniedError, plugin izole (isolation)
- Webhook: imza doğrulama + 5dk replay penceresi + retry (max 3)

## Reuse (yeniden yazılmayan)

Integration Hub (registry pattern), oauth.ts (buildAuthorizeUrl/exchangeCodeForToken/PKCE),
Agent Runtime, Action Engine, Executive, Memory, Knowledge Graph (recordPlugin),
mobile notification-center (push), quant/commerce servisleri (read-only context).

## API (9 uç)

/api/sdk, /api/plugins (GET+enable/disable/reload/grant), /install, /remove, /update, /search, /marketplace, /api/webhooks, /api/oauth

## Event Hook Wiring

trade-journal `journalOpen`→'trade.opened', `journalClose`→'trade.closed'. Diğer emit
noktaları modüllerde eklenebilir (emitHook çağrısı). Plugin manifest'te hook + enabled olmalı.
