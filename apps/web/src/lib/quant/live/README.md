# Live Trading Automation v1.0 (Sprint 20)

Paper Trading üstüne canlı katman. Mevcut risk-engine/exchanges/strategy/paper-
trading/position-manager REUSE eder. **Gerçek para kullanan HER emir Approval
Queue'dan geçer — onaysız borsaya gönderilemez.**

## Akış

```
Live Order → Risk Engine v2 → (ihlal: REDDET) → Action Engine (critical)
→ Approval Queue → Onay → Exchange (credential + onay) → Journal + Alert + KG
```

## Modüller (`src/lib/quant/live/`)

| Dosya                              | Görev                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `risk-engine-v2.ts`                | Mevcut checkOrderRisk (v1) REUSE + 4 canlı kontrol (sembol riski/günlük işlem/kara liste/haber-volatilite). İhlalde emir reddedilir |
| `live-order-engine.ts`             | Emir yaşam döngüsü: Risk v2 → Action Engine → Approval Queue. Onaysız gitmez                                                        |
| `live-actions.ts`                  | trade.liveOrder handler (critical risk) — onay sonrası paper engine ile fill takibi + journal + alert                               |
| `trade-journal.ts`                 | Giriş/çıkış/sebep/AI gerekçe/risk/sonuç → Memory + KG (recordTrade reuse)                                                           |
| `ai-trade-review.ts`               | Executive değerlendirme: neden açıldı/kapandı/hata/öneri + grade                                                                    |
| `portfolio-intelligence.ts`        | Equity/Balance/Daily-Weekly-Monthly PnL/Drawdown/Exposure/Allocation (syncPositions reuse)                                          |
| `live-alerts.ts`                   | position/TP/SL/trailing/risk/margin/likidasyon (ring buffer)                                                                        |
| `services/live-trading-service.ts` | Mobil/voice/dashboard facade (TTL cache)                                                                                            |

## Reuse (yeniden yazılmayan)

paper-trading (PaperTradingEngine), risk-engine (checkOrderRisk), exchanges registry,
strategy-engine, backtest, position-manager (syncPositions), market-data (getTicker),
Action Engine, Approval Queue, Executive, Memory, Knowledge Graph (recordTrade).

## Güvenlik

Risk v2 ihlali → emir borsaya ASLA gitmez (reddedilir). Geçen emir Action Engine
critical + source:'ai' → otomatik Approval Queue. Canlı borsa gönderimi API-key +
onay gerektirir; credential yoksa paper engine ile takip (gerçek, mock değil).

## API (9 uç `/api/trading`)

live, orders, positions, portfolio, risk (GET+PATCH), journal (GET+close/review), strategies, review, alerts

## Voice

"tüm pozisyonları kapat" (onay), "risk raporu", "bugünkü PnL" + mevcut trading.status/analysis
