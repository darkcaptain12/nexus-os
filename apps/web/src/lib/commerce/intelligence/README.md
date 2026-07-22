# Commerce Intelligence v1.0 (Sprint 19)

APEX artık sadece mağaza yönetmiyor — para kazandıran ürün bulur, analiz eder,
yayınlar, reklam yönetir, optimize eder. Yeni ZEKÂ katmanı: mevcut Executive/
Agent/Action/Approval/Knowledge/Memory/Integration Hub/commerce-service reuse.

## Modüller (`src/lib/commerce/intelligence/`)

| Dosya                                       | Görev                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery-registry.ts`                     | Product Discovery: pluggable provider (Shopify/Printify/Zendrop/AliExpress/CJ/CSV/custom); CSV gerçek parse, dış kaynaklar API-key ile |
| `product-scoring.ts`                        | 10 faktör → 0-100 Commerce Score (Trend/Rekabet/Marj/Reklam/Tedarik/Teslim/İade/Mevsim/Saturation/Executive Confidence)                |
| `competitor-intelligence.ts`                | Fiyat/indirim/stok/reklam/görsel/SEO takibi + history (ring buffer)                                                                    |
| `supplier-intelligence.ts`                  | Tedarikçi profili: kargo/risk/ülke/puan/maliyet                                                                                        |
| `product-hunter.ts`                         | AI Product Hunter: Executive risk skoru + scoring → queue                                                                              |
| `product-queue.ts`                          | Skorlanmış ürün kuyruğu (ring buffer)                                                                                                  |
| `creative-intelligence.ts`                  | Hook/başlık/açıklama/görsel prompt/video senaryo/UGC (üretim mevcut entegrasyonlarla)                                                  |
| `advertising-intelligence.ts`               | Meta/Google/TikTok kampanya planı (requiresApproval)                                                                                   |
| `ad-optimizer.ts`                           | CTR/CPC/ROAS/CPA takibi + Executive önerileri (bütçe/durdur/creative/audience)                                                         |
| `revenue-intelligence.ts`                   | Ciro/Kâr/ROAS/LTV/CAC/AOV/Conversion/Refund                                                                                            |
| `inventory-intelligence.ts`                 | Stok/kritik/reorder önerisi                                                                                                            |
| `commerce-actions.ts`                       | Action Engine handler'ları: publish (high), launchAd (critical), increaseBudget (critical)                                             |
| `services/commerce-intelligence-service.ts` | Facade + Commerce Dashboard (TTL cache)                                                                                                |

## Güvenlik Kuralı — Gerçek Para

Ürün yayınlama, reklam başlatma, bütçe artırma → Action Engine high/critical risk +
source:'ai' → engine OTOMATIK Approval Queue'ya alır. **Gerçek para harcayan hiçbir
işlem kullanıcı onayı olmadan çalışmaz.** Discovery+scoring+plan para harcamaz.

## Commerce Agent

Agent planner rule: "en çok para kazandıracak ürün bul" → Hunter(kayıt)→Publish(onaylı)
→Ads(onaylı)→Sonuç. Publish+Ads adımları requiresApproval:true.

## Reuse

commerce-service (migration 009), Executive (risk skoru), Agent Runtime, Action Engine,
Approval Queue, Knowledge Graph (recordCommerceProduct/recordAdCampaign), Memory, TTL cache.

## API (9 uç `/api/commerce`)

discovery (GET providers, POST hunt/discover/load-csv), products, publish, ads (GET+POST launch/metrics),
analytics, revenue, inventory, suppliers, recommendations
