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
