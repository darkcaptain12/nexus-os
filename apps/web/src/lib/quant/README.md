# APEX Quant — Trading Intelligence (Sprint 14)

Mevcut Agent Runtime, Action Engine, Approval Queue ve Memory Engine üzerine kurulu
trading zekâsı. Yeni Executive/Workflow/Memory sistemi İÇERMEZ.

## Modüller

| Dosya                       | Görev                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| `types.ts`                  | Tüm quant tipleri (Candle, Analysis, PaperOrder, Backtest…)                      |
| `exchanges/`                | Borsa adapter'ları (Binance, MEXC, Bybit) + genişletilebilir registry            |
| `market-data.ts`            | TTL cache'li candle/ticker çekimi                                                |
| `indicators.ts`             | SMA, EMA, RSI, MACD, VWAP, Bollinger, ATR (saf fonksiyonlar)                     |
| `smc.ts`                    | Smart Money Concepts: BOS, CHoCH, OB, FVG, Sweep, P/D, Breaker, Mitigation       |
| `analysis-engine.ts`        | Explainable piyasa yorumu (kural motoru — mevcut Executive pattern'i)            |
| `risk-engine.ts`            | Pozisyon boyutu, R/R, emir risk kontrolü (migration 008 risk_profiles kuralları) |
| `paper-trading.ts`          | Simüle hesap: emir, fill, PnL, SL/TP (gerçek para YOK)                           |
| `position-manager.ts`       | Gerçek fiyatla pozisyon takibi + Memory kaydı                                    |
| `strategy-engine.ts`        | EMA Cross, RSI Reversal, SMC Confluence stratejileri                             |
| `backtest-engine.ts`        | Win rate, max drawdown, profit factor, Sharpe-benzeri                            |
| `alert-engine.ts`           | Fiyat/RSI alarmları                                                              |
| `trading-actions.ts`        | Action Engine handler'ları: trade.analyze / trade.riskCheck / trade.paperOrder   |
| `services/quant-service.ts` | Mobil-hazır servis katmanı (düz JSON sözleşmesi)                                 |
| `services/voice-service.ts` | APEX Voice intent altyapısı (ses motoru değil)                                   |

## Güvenlik Kuralı

Gerçek borsaya emir gönderen kod YOKTUR. `trade.paperOrder` yalnızca paper hesaba
yazar ve agent planında `requiresApproval: true` işaretlidir — Approval Queue her
zaman son kontrol noktasıdır.

## Yeni Borsa Ekleme

```ts
import { registerExchange } from './exchanges/registry';
registerExchange(myAdapter); // ExchangeAdapter interface'ini implement et
```
