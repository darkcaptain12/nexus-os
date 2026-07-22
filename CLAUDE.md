# APEX OS — Development Rules

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo
- **App**: `apps/web` — Next.js 16, App Router, TypeScript strict
- **Packages**: `packages/*` — Shared libraries consumed by all apps
- **Workers**: `workers/*` — Background job processors
- **Database**: Supabase (PostgreSQL), migrations in `supabase/migrations/`
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand (client), TanStack Query (server)
- **Forms**: React Hook Form + Zod validation
- **Kernel**: OS runtime via `@apex-os/kernel` — DI, CQRS, events, workflows, tasks, scheduler, plugins
- **Kernel Runtime**: `createKernel()` boots all subsystems, exposes via `kernel.events`, `kernel.commands`, etc.
- **Events**: Typed pub/sub via `@apex-os/events`, runtime via `@apex-os/kernel/event-runtime`
- **Logging**: Pino via `@apex-os/logger`

## Commands

```bash
pnpm dev           # Start all (Turborepo)
pnpm dev:web       # Web app only
pnpm build         # Production build
pnpm lint          # Lint all packages
pnpm format        # Format all files
pnpm type-check    # TypeScript check
pnpm clean         # Remove build artifacts
```

## Architecture Rules

- Feature-based architecture. Each module is self-contained.
- Shared code goes in `packages/*`. Never duplicate across apps.
- Apps import packages. Packages never import apps.
- Workers consume packages. Workers never import other workers.
- Events for inter-module communication. Never direct imports between modules.
- New packages must include: `package.json`, `tsconfig.json`, `src/index.ts`, `README.md`.

## Coding Rules

- TypeScript strict mode. No `any`. No `@ts-ignore`. No disabled rules.
- No JavaScript files. TypeScript only.
- Server Components by default. `'use client'` only when state/effects needed.
- Never hardcode secrets. Environment variables only.
- Never duplicate code. Extract to shared packages.
- Never install unnecessary packages. Check if existing packages cover it.
- `console.warn` and `console.error` only. Use `@apex-os/logger` for structured logging.
- Validate all external input with Zod at system boundaries.

## Naming Rules

- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Directories**: `kebab-case/`
- **Components**: `PascalCase`
- **Functions/variables**: `camelCase`
- **Types/interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Database columns**: `snake_case`
- **Environment variables**: `UPPER_SNAKE_CASE`, prefix public with `NEXT_PUBLIC_`
- **Packages**: `@apex-os/<name>`
- **Events**: `<domain>.<action>` (e.g., `trade.opened`, `user.created`)

## Folder Rules

- Every folder must contain `README.md`.
- No empty folders. Use `.gitkeep` only during initial scaffold.
- Feature modules: `components/`, `hooks/`, `lib/`, `types/`
- No `index.ts` barrel files deeper than package root.

## Component Rules

- Prefer reusable components in `packages/ui`.
- Every component must handle loading and error states.
- Dark mode first. Mobile first.
- Accessibility required: ARIA labels, keyboard navigation, focus management.
- No inline styles. Tailwind classes only.
- Extract repeated class combinations into component variants (CVA).

## Persistence Rules (Faz 2 — Supabase write-through)

- In-memory globalThis store'lar (trade-journal/memory/agent/knowledge-graph/cloud-devices/commerce-queue/executive lessons+goals) Supabase'e **write-through** eder: sync add/update globalThis'te kalır (mevcut API korunur), kalıcı yazım `deferPersist()` ile arka planda.
- **`deferPersist()` (`lib/persist-after.ts`) zorunlu** — Next.js `after()` kullanır, serverless'te fire-and-forget kısa request bitince kesildiği için. Doğrudan `void persist().catch()` KULLANMA.
- Write-through repository'ler service-role client (RLS bypass, action handler user-context'siz). Supabase yoksa `false`/`null` → globalThis fallback (graceful).
- Yeni store kalıcılığı: migration (tablo + RLS + service_role grant) + `persistX`/`loadXFromDb` repository + store add/update'te `deferPersist(() => persistX(...))`.
- Gerçek-zamanlı/türetilebilir veriler (presence/vitals/sync-delta/intel-score-history) kalıcılık dışı — kasıtlı.

## Database Rules

- All tables need `id`, `created_at`, `updated_at`.
- Row Level Security (RLS) on every table.
- Migrations via Supabase CLI. Never modify production directly.
- Use `snake_case` for all database identifiers.
- Foreign keys with cascading deletes where appropriate.
- Index frequently queried columns.
- Soft delete via `deleted_at` column. Never hard delete.
- Every query on soft-deletable tables must filter `deleted_at is null`.
- Use `created_by` column for audit trail.
- pgvector for embedding storage (1536 dimensions default).
- Use `search_memories()`, `search_documents()`, `search_knowledge()` for vector search.
- `hybrid_search_memories()` for combined full-text + vector search.
- Audit triggers on critical tables (users, agents, positions, orders, automations, workflows).

## Performance Rules

- Server Components for data fetching. No client-side fetching for initial page load.
- Dynamic imports for heavy components: `next/dynamic`.
- Image optimization via `next/image`.
- No blocking waterfall requests. Parallel data fetching with `Promise.all`.
- Memoize expensive computations. Use `React.memo` only when measured.

## Authentication Rules

- Supabase Auth via `@supabase/ssr` for SSR cookie-based sessions.
- Protected routes: middleware redirects + layout server component guards.
- Auth pages under `(auth)` route group: `/giris`, `/kayit`, `/sifre-sifirla`.
- Dashboard pages under `(dashboard)` route group — require authenticated user.
- Mock Supabase client when env vars not configured — graceful degradation.
- All auth UI in Turkish.

## Security Rules

- Never hardcode API keys, tokens, or credentials.
- Validate and sanitize all user input.
- Use parameterized queries. Never string-concatenate SQL.
- CSRF protection on all mutating endpoints.
- Rate limiting on public API endpoints.
- Content Security Policy headers.
- Secrets in environment variables, never in code or git.

## Documentation Rules

- Always update README after structural changes.
- Always update this CLAUDE.md after architecture changes.
- Architecture decisions go in `docs/adr/`.
- Never delete existing documentation. Update or archive.
- Every package and app has its own README.

## Quant Rules (APEX Quant — Sprint 14)

- Trading kodu `apps/web/src/lib/quant/` altında; mevcut Agent Runtime + Action Engine + Approval Queue + Memory üstüne kuruludur.
- Borsa erişimi yalnızca `exchanges/registry.ts` üzerinden (`getExchange`). Yeni borsa = `ExchangeAdapter` implement et + `registerExchange`.
- Gerçek borsa emri YALNIZCA şu güvenlik zincirinin tamamı geçtiğinde gönderilir: **Risk Engine v2 → Approval Queue onayı → Kill-Switch (env `LIVE_TRADING_ENABLED` + runtime arm, ikisi de açık)**. Kill-switch varsayılan KAPALI = paper tracking. `trade.paperOrder` her zaman paper. Onaysız/kill-switch kapalı emir borsaya ASLA gitmez. Gerçek emir kodu `exchanges/okx-trade.ts` (signed, withdraw endpoint YOK) + `live/kill-switch.ts` + `live/live-actions.ts`.
- Market data her zaman TTL cache (`withCache`) arkasından çekilir.
- Yeni indikatör/SMC fonksiyonları saf olmalı: girişle aynı uzunlukta dizi döner, hesaplanamayan noktalar `null`.
- Mobil/voice istemcileri `services/quant-service.ts` sözleşmesini kullanır: düz JSON, UI/framework tipi sızmaz.

## Knowledge Graph Rules (Sprint 15)

- Ortak ilişkisel hafıza `apps/web/src/lib/knowledge/` altında; tüm modüller aynı graph'ı paylaşır (`getKnowledgeGraph()`).
- Yeni ilişki kurmak için `relationship-engine.ts` `link()` kullanılır — doğrudan store'a edge yazma.
- Yeni modül entegrasyonu = `auto-linker.ts`'e `recordX()` helper'ı ekle; entity çıkarımı için mevcut `memory/entity-extractor` kullanılır, yeni extractor yazılmaz.
- 15 node tipi ve 11 ilişki tipi `knowledge/types.ts`'te sabittir; genişletme tipleri güncelleyerek yapılır.
- Graph API'leri düz JSON döner (mobil sözleşmesi); traversal'lar depth+limit'lidir — sınırsız gezinme yasak.
- Executive bağlamı `context-selector.ts` `selectGraphContext()` üzerinden beslenir (Context Builder v2).

## Desktop Intelligence Rules (Sprint 16)

- Vision/OCR kodu `apps/web/src/lib/desktop-vision/` altında; mevcut Desktop Agent + Memory + Knowledge Graph üstüne kuruludur.
- Ham pixel→text (OCR) ve binary→text (dosya) çıkarımı istemci-tarafı (native/mobil ML Kit) veya kayıtlı provider'da yapılır. Yeni OCR provider = `OcrProvider` implement et + `registerOcrProvider`.
- OCR sürekli çalışmaz: `runOcr` hash dedup ile aynı ekranı atlar (force=false). Poll YOK — CPU dostu.
- Tüm vision çıktısı mevcut `MemoryStore` (source: 'desktop') + Knowledge Graph auto-linker'a bağlanır. Yeni memory/extractor yazma.
- Türkçe metin matching'de `toLocaleLowerCase('tr')` kullan (İ/I case-fold).
- Servis katmanı (`services/desktop-vision-service.ts`) düz JSON döner — mobil/voice sözleşmesi.

## Voice AI Rules (Sprint 17)

- Voice kodu `apps/web/src/lib/voice/` altında; mevcut intent katmanını (`quant/services/voice-service.ts` parseVoiceIntent/handleVoiceIntent) REUSE eder, yeniden yazma.
- Ham audio DSP (wake word), STT, TTS istemci-tarafı veya kayıtlı provider'da. Yeni provider = `SttProvider`/`TtsProvider`/`WakeWordDetector` implement et + registry'e kaydet.
- Wake word event-driven — server poll YOK; istemci audio snippet besler, server skorlar (confidence + false-positive azaltma).
- Konuşmalar mevcut `MemoryStore` (source: 'voice') + önemli kararlar Knowledge Graph auto-linker'a bağlanır.
- Riskli sesli komutlar handleVoiceIntent'te requiresApproval → Approval Queue son kontrol.
- Servis katmanı (`services/voice-ai-service.ts`) düz JSON döner — mobil/Apple Watch sözleşmesi.

## Mobile Platform Rules (Sprint 18)

- Mobil kod `apps/web/src/lib/mobile/` altında; katman tamamen FACADE — mevcut servisleri (Executive/Agent/Voice/Desktop/Knowledge/Trading/Commerce) aggregate eder, yeni iş mantığı YAZMA.
- Framework-bağımsız düz JSON döner; iPhone/iPad/Android/Apple Watch/Wear OS aynı `services/mobile-service.ts` sözleşmesini kullanır.
- Event-driven: cihaz heartbeat/BackgroundTasks tetikler, server poll YOK. Ring buffer'lar (cihaz/push/mutation) — memory leak yok.
- Auth Supabase reuse; biyometrik (FaceID/TouchID/Passkey) ham işlemi istemci Secure Enclave'de.
- Commerce okuması `lib/commerce/commerce-service.ts` (migration 009 üstünde gerçek Supabase, unconfigured'da graceful boş).
- Offline-first: mobile-runtime her build offline snapshot'ı tazeler; sync-client conflict resolution yapar.

## Commerce Intelligence Rules (Sprint 19)

- Commerce zekâsı `apps/web/src/lib/commerce/intelligence/` altında; mevcut Executive/Agent/Action/Approval/Knowledge/Memory/commerce-service reuse eder — yeni iş mantığı minimumda.
- Gerçek para harcayan işlemler (ürün yayınlama, reklam başlatma, bütçe artırma) Action Engine'de high/critical risk + source:'ai' → OTOMATIK Approval Queue. Onaysız asla çalışmaz.
- Product Discovery pluggable: yeni kaynak = `DiscoveryProvider` implement et + `registerDiscoveryProvider`. Dış kaynaklar API-key yoksa graceful boş.
- Product scoring saf fonksiyon (10 faktör, 0-100); Executive risk skoru scoring context'ine beslenir.
- Görsel/video ÜRETİMİ mevcut entegrasyonlarla tetiklenir; creative-intelligence yalnız brief üretir, yeni üretim motoru yazma.
- Facade `services/commerce-intelligence-service.ts` düz JSON döner (mobil/dashboard). Ağır okumalar TTL cache arkasında.

## Live Trading Rules (Sprint 20)

- Canlı trading kodu `apps/web/src/lib/quant/live/` altında; Paper Trading üstüne kuruludur, mevcut risk-engine/exchanges/strategy/paper-trading/position-manager REUSE eder.
- Risk Engine v2 (`risk-engine-v2.ts`) mevcut `checkOrderRisk` (v1) üstüne 4 canlı kontrol ekler. Kural ihlali → emir REDDEDİLİR, borsaya asla gönderilmez.
- Gerçek para kullanan HER emir Action Engine `trade.liveOrder` (critical risk) + source:'ai' → OTOMATIK Approval Queue. Onaysız emir gönderilemez.
- Trade Journal her işlemi Memory + Knowledge Graph'a bağlar (`recordTrade` reuse). AI Trade Review kapanışta Executive değerlendirmesi üretir.
- Portfolio Intelligence `syncPositions` (paper account, gerçek fiyat) reuse eder; yeni pozisyon takibi yazma.
- Facade `services/live-trading-service.ts` düz JSON döner (mobil/voice/dashboard). Ağır okuma TTL cache.

## Developer Platform Rules (Sprint 21)

- Plugin platform kodu `apps/web/src/lib/plugins/` altında; mevcut Integration Hub + registry pattern + integrations/oauth REUSE eder.
- Plugin sisteme DOĞRUDAN erişemez — yalnız `plugin-context.ts` (Public SDK yüzeyi) üzerinden, her çağrı izin-kontrollü. İzin yoksa yüzey undefined.
- İzin manifest'te talep edilmeli + kullanıcı grant'i + plugin enabled olmalı. Manifest-dışı izin verilemez (permission-engine).
- Yeni SDK yüzeyi = `plugin-context.ts`'e izin-kontrollü wrapper ekle; mevcut servisi sar, yeniden yazma.
- Event hook = `event-hooks.ts` emitHook (modül tarafı) + subscribeHook (plugin). Plugin manifest'te hook + enabled olmalı.
- Webhook imza + replay protection zorunlu; OAuth PKCE/OpenID mevcut oauth üzerinden.
- Facade `services/developer-platform-service.ts` düz JSON döner (mobil/dashboard).

## Cloud Sync + Multi Device Rules (Sprint 22)

- Cloud kodu `apps/web/src/lib/cloud/` altında; katman ORKESTRASYON'dur — mevcut Mobile (device-registry/sync-client/offline-store/notification-center), Memory, Knowledge Graph, Auth REUSE eder. Yeni iş mantığı minimumda.
- Cihaz tipleri 8: mac/windows/iphone/ipad/apple-watch/android/wear-os/web. Mobil platformlar mevcut mobile registry'ye de kaydedilir (push token akışı) — yeniden yazma yok.
- Cihaz yaşam döngüsü: register (pending) → pair (6 haneli kod, 5dk TTL) → verify (active) → trust (yalnız verified). Revoke edilen cihaz sync/push/routing dışı; oturumları kapanır, push token silinir.
- Sync yalnız DELTA taşır: domain:key versiyon sayacı + global sequence, cihaz cursor'ı incremental pull. 11 domain. Full snapshot taşınmaz.
- Conflict: LWW (varsayılan) / Merge (settings/memory/notifications) / Manual Review (trading/commerce/executive). Kritik domain conflict'i ASLA otomatik ezilmez → `conflict-resolver` manuel kuyruk.
- Offline queue: content-hash duplicate prevention + exponential backoff retry. `processOfflineQueue(applyFn)` — dependency injection, circular import yok.
- Notification routing kural tablosu (`notification-router.ts`): approval→telefon, critical risk→saat+telefon, desktop→Mac/Windows; push üretimi notification-center reuse. Critical live-alert otomatik router'a bağlı.
- Handoff (`handoff-engine.ts`): Voice/Agent/Executive/Workflow/Commerce/Trading context devri, TTL 5dk; kaynak cihaz kendi handoff'unu devralamaz. Devir KG `recordHandoff`.
- Cihaz kaydı KG `recordDevice` (User→Device). Backup item sayıları GERÇEK store'lardan (Memory/KG/plugin/feature flags/offline snapshot).
- Event-driven: cihaz heartbeat/presence/vitals gönderir, server poll YOK. Ring buffer'lar her yerde.
- Facade `services/cloud-service.ts` düz JSON döner (mobil/watch/dashboard).

## AI Automation & Personal Optimization Rules (Sprint 23)

- Self-optimization kodu `apps/web/src/lib/executive/optimization/` altında; Executive ÜSTÜNE kurulur. Mevcut decision-history (ai) + agent-store + live-trading (journal/portfolio/strategy) + commerce-intelligence (revenue/ad) + workflow-runtime + Memory + Knowledge Graph REUSE eder. **Yeni AI motoru YOK.**
- **KRİTİK GÜVENLİK: Hiçbir gelir etkileyen işlem (trade, reklam, ürün yayını, bütçe) otomatik yapılmaz.** Bu katman yalnız ÖNERİ üretir. Commerce önerileri (ölçek/reklam/fiyat/kaldır) `requiresApproval: true` → Approval Queue. Trading önerileri (promote/demote) gerçek ayar değiştirmez.
- Self-review (`self-review.ts`) mevcut decision-history + journal + ad-metrics + agent-store + workflow'dan başarısızlıkları OKUR; yeni veri toplamaz.
- Learning (`learning-engine.ts`) her başarısızlık için neden/tekrar-riski/önlem → Memory `addDecision` + KG `recordLearning`. Executive Context (mevcut context-builder, yeniden yazma) bu dersleri okur. Dedup: aynı `domain:ref` bir kez öğrenilir.
- Goal engine default'ları: 100k TL kâr (aylık) / 10 ürün (haftalık) / 5 analiz (günlük) / ROAS>4. İlerleme GERÇEK store'lardan; öncelik = en geride kalan.
- Intelligence Score: 6 boyut (trading/commerce/workflow/agent/productivity/learning) → tek 0-100, ağırlıklı (gelir boyutları %22). Gerçek metrik formülleri; veri yoksa nötr 50.
- CEO Report (haftalık) + Monthly Review tüm optimizer'ları aggregate eder; Memory timeline'a yazar. Yeni strateji/ürün analizi = optimizer'a fonksiyon ekle, yeniden yazma.
- Facade `services/self-optimization-service.ts` düz JSON döner (mobil/watch/dashboard); ağır okuma TTL cache. Watch: günlük hedef/score/kâr/kritik öneri.

## Production Hardening Rules (Sprint 24)

- Production denetim kodu `apps/web/src/lib/observability/production/` altında; **yeni özellik YOK** — mevcut observability (getMetrics/health/security-audit/production-checklist/production-audit), cache, cloud-backup, agent-store, notification altyapısını DENETLER + aggregate eder.
- Audit modülleri mevcut store/metrics/cache'i OKUR, yeni state minimumda (alert ring buffer hariç). stability-audit 18 bounded buffer + globalThis singleton envanteri; canlı boyut > MAX ise leak sinyali.
- Recovery-verify: agent/workflow/queue/trading/commerce/sync restart'ta devam eder mi — globalThis singleton + backup + pending queue mekanizmasını doğrular, yeni recovery kodu yazmaz.
- Performance-audit gerçek `process.memoryUsage/cpuUsage/eventLoopHistogram` + cache stats + getPercentiles reuse. Load-test gerçek in-process benchmark (production yollarını N iter çağırır).
- **Alert Engine mevcut `routeNotification` REUSE eder** (Discord/Telegram/Email + saat/telefon) — yeni bildirim sistemi YASAK. Kritik eşik → notification'a yönlenir.
- RC Score 7 kriter (stability/performance/security/recovery/monitoring/testCoverage/productionReadiness) → 0-100; security-audit + checklist + production-audit reuse. Sorunlar `knownIssues`'da raporlanır, gizlenmez.
- Facade `services/production-service.ts` düz JSON döner; ağır rapor TTL cache. 6 API route `/api/system/{production,load,stability,recovery,backup-test,rc}`.

## AI Rules

- AI is the central nervous system. All modules communicate through AI, never directly.
- All AI calls go through `@apex-os/ai` provider abstraction.
- Never hardcode model names. Use config and router.
- Always include token usage tracking via telemetry.
- Implement fallback chains for provider outages.
- Store conversation context via `@apex-os/ai/memory`.
- Prompt templates in `packages/ai/src/prompts/`.
- All agent actions pass through safety guard before execution.
- External integrations must be registered as tools in the tool registry.
- AI subsystems: core, router, agents, registry, context, execution, memory, prompts, providers, embeddings, tools, planning, reasoning, telemetry, contracts, evaluation, safety.

## Review Checklist

Before merging any PR:

- [ ] TypeScript strict — no errors, no `any`
- [ ] Existing features unbroken
- [ ] Loading and error states implemented
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] No hardcoded secrets
- [ ] No duplicated code
- [ ] Zod validation at boundaries
- [ ] README updated if structure changed
- [ ] CLAUDE.md updated if architecture changed

## Definition of Done

A feature is complete when:

1. Code compiles with zero TypeScript errors
2. Lint passes with zero warnings
3. Loading states render correctly
4. Error states render correctly
5. Dark and light themes work
6. Mobile and desktop layouts work
7. Accessibility requirements met
8. Documentation updated
9. No regressions in existing features

## Forbidden Practices

- `@ts-ignore` or `@ts-expect-error` without linked issue
- `any` type anywhere
- `console.log` in committed code
- Hardcoded secrets or API keys
- Pages Router (`pages/` directory)
- JavaScript files (`.js`, `.jsx`)
- CSS modules or styled-components (use Tailwind)
- Direct database queries outside `@apex-os/database`
- Cross-module imports (use events)
- Committing `.env` files

## Path Aliases

- `@/*` → `apps/web/src/*`
- `@apex-os/ui` → `packages/ui/src`
- `@apex-os/types` → `packages/types/src`
- `@apex-os/utils` → `packages/utils/src`
- `@apex-os/config` → `packages/config/src`
- `@apex-os/logger` → `packages/logger/src`
- `@apex-os/auth` → `packages/auth/src`
- `@apex-os/events` → `packages/events/src`
- `@apex-os/ai` → `packages/ai/src`
- `@apex-os/memory` → `packages/memory/src`
- `@apex-os/validation` → `packages/validation/src`
- `@apex-os/database` → `packages/database/src`
- `@apex-os/notifications` → `packages/notifications/src`
- `@apex-os/automation` → `packages/automation/src`
- `@apex-os/shared` → `packages/shared/src`
- `@apex-os/sdk` → `packages/sdk/src`
- `@apex-os/kernel` → `packages/kernel/src`

## Feature Flags

Modules are gated by feature flags in `packages/config/src/features.ts`. Override via environment variables: `NEXT_PUBLIC_FEATURE_<NAME>=true`.
