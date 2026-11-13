# AI Automation & Personal Optimization (Sprint 23)

APEX artık sadece karar vermiyor — **kendi performansını ölçüp geliştiriyor**. Katman Executive üstüne kurulur; mevcut decision-history, agent-store, live-trading, commerce-intelligence, workflow-runtime, Memory ve Knowledge Graph motorlarını REUSE eder. **Yeni AI motoru YOK.**

## Modüller (`apps/web/src/lib/executive/optimization/`)

| Modül                                   | Sorumluluk                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                              | Framework-bağımsız tipler (mobil/watch/dashboard sözleşmesi)                                                                                                            |
| `self-review.ts`                        | Executive günlük self review — doğru/yanlış/iptal kararlar + başarısız trade/ad/workflow/agent (decision-history + journal + ad-metrics + agent-store + workflow reuse) |
| `learning-engine.ts`                    | Her başarısızlık için neden/tekrar-riski/önlem → Memory + KG (`recordLearning`). Executive Context bunu okur                                                            |
| `goal-engine.ts`                        | Hedefler (100k TL kâr / haftada 10 ürün / günlük 5 analiz / ROAS>4) + gerçek ilerleme + önceliklendirme                                                                 |
| `revenue-optimizer.ts`                  | Commerce + Trading birlikte → öneri (ticarete zaman ayır / bütçe artır / yüksek marjlı ürün bul)                                                                        |
| `trading-optimizer.ts`                  | Strateji başına WinRate/ProfitFactor/Sharpe-benzeri/Drawdown/süre → promote/keep/demote öner (gerçek ayar YOK)                                                          |
| `commerce-optimizer.ts`                 | Ürün başına satış/reklam/ROAS/marj/iade → scale/remove/fiyat/reklam. Gelir işlemi `requiresApproval: true`                                                              |
| `agent-optimizer.ts`                    | Agent (başarı/süre/bekleme/hata/approval) + Workflow (yavaş/tekrar/otomasyon) analizi + öneri                                                                           |
| `intelligence-score.ts`                 | 6 boyut (Trading/Commerce/Workflow/Agent/Productivity/Learning) → tek 0-100 skor + trend                                                                                |
| `ceo-report.ts`                         | Haftalık CEO raporu + Aylık review — tüm optimizer'ları aggregate; Memory'ye timeline                                                                                   |
| `services/self-optimization-service.ts` | Düz JSON facade — TTL cache arkasında; 8 API route                                                                                                                      |

## Kritik Kural — GÜVENLİK

**Hiçbir gelir etkileyen işlem otomatik yapılmaz.** Bu katman yalnız **öneri** üretir:

- Trading: strateji pasifle/öne çıkar → yalnız öneri, gerçek ayar kullanıcıda.
- Commerce: ürün kaldır/ölçekle/fiyat/reklam → `requiresApproval: true`, Approval Queue son kontrol.
- Trade/reklam/ürün yayını/bütçe değişikliği ASLA otomatik tetiklenmez.

## Reuse Zinciri

```
decision-history + journal + ad-metrics + agent-store + workflow-runtime
        ↓ (self-review okur)
learning-engine → Memory (addDecision) + KG (recordLearning)
        ↓
Executive Context (mevcut context-builder, yeniden yazılmaz)
```

Yeni öğrenilenler → Memory → Knowledge Graph → Executive Context. Döngü kapanır: APEX geçmiş başarısızlıklarından öğrenip daha iyi kararlar verir.

## API

`/api/executive/{review,goals,learning,report,intelligence,recommendations,optimization,history}` — Zod + `withErrorBoundary`.
