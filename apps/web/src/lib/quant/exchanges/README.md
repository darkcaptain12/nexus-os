# Exchange Adapters

`ExchangeAdapter` interface'i (`types.ts`) üzerinden borsa soyutlaması.
Yalnızca public market-data uçları — emir gönderimi bu katmanda yok.

- `binance.ts` — api.binance.com/api/v3 (klines + 24hr ticker)
- `mexc.ts` — api.mexc.com/api/v3 (Binance-uyumlu şema, parser paylaşılır)
- `bybit.ts` — api.bybit.com/v5/market (list yeniden-eskiye gelir, ters çevrilir)
- `registry.ts` — `getExchange(name)` / `registerExchange(adapter)` / `listExchanges()`

Parser fonksiyonları saf ve ayrı export edilir — testler gerçek yanıt şemalarıyla
ağa çıkmadan doğrular.
