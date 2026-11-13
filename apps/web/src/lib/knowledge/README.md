# Knowledge Graph v2 — Relationship Intelligence (Sprint 15)

Tüm APEX OS modüllerinin paylaştığı ortak ilişkisel hafıza. Yeni Memory sistemi
DEĞİL: mevcut MemoryStore/entity-extractor/retrieval-pipeline'ın üstünde
runtime ilişki katmanı.

## Modüller

| Dosya                    | Görev                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`               | 15 node tipi, 11 ilişki tipi, arama/istatistik sözleşmeleri                                                                                                                            |
| `graph-store.ts`         | In-memory graph: adjacency list (O(1) komşuluk), upsert-by-name (duplicate tespiti), edge dedupe, BFS neighborhood, ring buffer limitleri                                              |
| `relationship-engine.ts` | İlişki semantiği + `link()` / `linkChain()` / `getRelated()`                                                                                                                           |
| `auto-linker.ts`         | Otomatik ilişkilendirme: mevcut `entity-extractor` + domain sözlüğü (borsa/kripto/strateji); `recordAgentCreated/Step`, `recordTrade`, `recordMarketAnalysis`, `recordDesktopActivity` |
| `semantic-search.ts`     | Hibrit tek sorgu: keyword + entity tipi + ilişki + timeline; `findSimilar` (ortak komşu + isim kesişimi)                                                                               |
| `context-selector.ts`    | Context Builder v2: konu → seed arama → 1-hop genişletme → derece+güncellik skoru → Executive bağlamı                                                                                  |

## Beslenme Noktaları (mevcut modüllere hook)

- `agents/agent-runtime.ts` createAgent → agent→goal (owns) + hedef metni ingest
- `agents/agent-runner.ts` step done → agent→task (owns), task→goal (belongs_to)
- `quant/trading-actions.ts` → trade→strategy→decision→risk→portfolio→market zinciri
- `api/desktop/sync` → file→app→website→project zinciri
- `ai/orchestrator/context-pipeline.ts` → OrchestratorContext.knowledge (graph seçimi)
- `quant/services/voice-service.ts` → `memory.recall` intenti graph'tan cevaplar

## Performans

Adjacency list: komşuluk sorguları edge listesini taramaz (N+1 yok).
Tüm listeler limit/offset'li (lazy loading). MAX_NODES=5000, MAX_EDGES=20000
ring buffer. API'ler mobil-uyumlu düz JSON döner.
