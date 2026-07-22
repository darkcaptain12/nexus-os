# Changelog

APEX OS — kişisel AI işletim sistemi. Tüm sürümler bu dosyada belgelenir.
Format: sprint bazlı; her sprint bir özellik/hardening turu.

## [1.0.0] — 2026-07-10

APEX OS v1.0 Production Release. 25 sprint, tek kullanıcılı çok-cihazlı AI OS.

### Öne Çıkanlar

- **Executive AI** — merkezi karar motoru, self-review + öğrenme + Intelligence Score
- **Trading** — APEX Quant (indikatör/SMC/paper trading/OKX), Live Trading + Risk Engine v2
- **Commerce** — ürün keşif/scoring/reklam/revenue intelligence
- **Voice** — "Hey APEX" wake word, STT/TTS, follow-up konuşma
- **Cloud Sync** — 8 cihaz tipi, delta sync, conflict resolution, handoff
- **Plugin SDK** — Marketplace (12 plugin), Public API, izin-kontrollü sandbox
- **Knowledge Graph** — 15 node/11 relation, auto-linking, hybrid search
- **Production** — stability/recovery audit, RC score, installation wizard

### Güvenlik Garantileri

- Gerçek para kullanan tüm emirler Approval Queue'dan geçer (onaysız emir yok)
- Risk kuralı ihlalinde emir borsaya gönderilmez
- Plugin'ler yalnız izin verilen API'ler üzerinden çalışır
- Gelir etkileyen hiçbir işlem otomatik yapılmaz

### Sprint Özeti

| Sprint | Başlık                                       | Tür       |
| ------ | -------------------------------------------- | --------- |
| 1-2    | Foundation, Auth & Database                  | feature   |
| 3-4    | Kernel/Events, AI Provider Abstraction       | feature   |
| 5-6    | Memory Engine, Action Engine & Approval      | feature   |
| 7-8    | Workflow Automation, Integration Hub         | feature   |
| 9-10   | Security Middleware, Production Readiness v1 | hardening |
| 11-12  | Desktop Agent, Dashboard & Widgets           | feature   |
| 13     | Agent Framework v1.0                         | feature   |
| 14     | APEX Quant v1.0                              | feature   |
| 15     | Knowledge Graph v2                           | feature   |
| 16     | Desktop Intelligence                         | feature   |
| 17     | Voice AI "Hey APEX"                          | feature   |
| 18     | Mobile Platform                              | feature   |
| 19     | Commerce Intelligence                        | feature   |
| 20     | Live Trading Automation                      | feature   |
| 21     | Developer Platform (Plugin SDK)              | feature   |
| 22     | Cloud Sync + Multi Device                    | feature   |
| 23     | AI Automation & Personal Optimization        | feature   |
| 24     | Production Hardening Final (RC)              | hardening |
| 25     | APEX OS v1.0 Release                         | hardening |

### Teknik

- 895 test geçiyor · 0 TypeScript hatası · build ✓
- 0 circular dependency · kullanılmayan iş kodu yok
- Migration version: 19

### Known Issues

- Supabase/AI/Trading/Commerce API key'leri operasyonel gereksinim (kod dışı)
- Canlı servis yapılandırmaları kullanıcı tarafından sağlanır
