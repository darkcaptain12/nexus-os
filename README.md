# APEX OS

Personal AI Operating System — a unified platform for managing work, trading, e-commerce, automation, memory, and daily life through AI-assisted workflows.

## Vision

One system to rule all personal operations. AI assists, user approves critical actions. Modular, extensible, secure.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    APEX OS                          │
├──────────┬──────────┬───────────┬───────────────────┤
│  Web App │  Mobile  │  Desktop  │ Browser Extension │
│ (Next.js)│  (React  │  Agent    │  (Manifest V3)    │
│          │  Native) │  (Tauri)  │                   │
├──────────┴──────────┴───────────┴───────────────────┤
│                  MCP Server                         │
├─────────────────────────────────────────────────────┤
│              Shared Packages                        │
│  ai │ auth │ events │ memory │ automation │ ...     │
├─────────────────────────────────────────────────────┤
│              Background Workers                     │
│  ai │ scheduler │ notification │ crawler │ memory   │
├─────────────────────────────────────────────────────┤
│          Supabase (PostgreSQL + Auth + Storage)     │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| AI | Multi-provider (OpenAI, Anthropic, Gemini, Ollama) |
| Logging | Pino |
| Monorepo | pnpm workspaces + Turborepo |
| CI/CD | GitHub Actions + Vercel |

## Folder Structure

```
APEX-OS/
├── apps/
│   ├── web/                  # Next.js 16 — primary web application
│   ├── mobile/               # Mobile app (planned)
│   ├── desktop-agent/        # Desktop automation agent (planned)
│   ├── browser-extension/    # Browser extension (planned)
│   └── mcp-server/           # MCP server for LLM integration (planned)
├── packages/
│   ├── ai/                   # AI provider abstraction + routing
│   ├── auth/                 # Authentication + RBAC
│   ├── automation/           # Workflow automation interfaces
│   ├── config/               # App config + feature flags
│   ├── database/             # Database client abstraction
│   ├── events/               # Event system (pub/sub)
│   ├── logger/               # Structured logging (Pino)
│   ├── memory/               # Memory engine interfaces
│   ├── notifications/        # Multi-channel notifications
│   ├── sdk/                  # APEX OS SDK
│   ├── shared/               # Shared constants + helpers
│   ├── types/                # Domain types
│   ├── ui/                   # UI component library
│   ├── utils/                # Utility functions
│   └── validation/           # Zod validation schemas
├── workers/
│   ├── ai-worker/            # AI task processing
│   ├── scheduler/            # Cron job scheduler
│   ├── notification-worker/  # Notification delivery
│   ├── automation-worker/    # Workflow execution
│   ├── crawler-worker/       # Web scraping
│   └── memory-worker/        # Embedding + indexing
├── supabase/
│   ├── migrations/           # Database migrations
│   └── seed/                 # Seed data
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   ├── architecture/         # System design docs
│   ├── api/                  # API documentation
│   ├── database/             # Schema documentation
│   ├── modules/              # Module specifications
│   ├── security/             # Security documentation
│   ├── ai/                   # AI documentation
│   └── ...                   # More doc sections
├── scripts/                  # Utility scripts
└── .github/workflows/        # CI/CD pipelines
```

## Installation

```bash
git clone <repo-url>
cd APEX-OS
pnpm install
cp .env.local.example .env.local
# Fill in environment variables
pnpm dev
```

## Development

```bash
pnpm dev           # Start all dev servers (Turborepo)
pnpm dev:web       # Start web app only
pnpm build         # Production build
pnpm lint          # Lint all packages
pnpm format        # Format with Prettier
pnpm type-check    # TypeScript check
pnpm clean         # Clean build artifacts
```

## Turborepo

Build orchestration with intelligent caching:

- `pnpm build` — Builds all packages respecting dependency graph
- `pnpm lint` — Lints all packages in parallel
- `pnpm type-check` — Type checks all packages

## Conventions

- **TypeScript strict** — No `any`, no JS files, no disabled rules
- **Server Components** default — `'use client'` only when needed
- **Dark mode first** — All UI works in dark mode before light mode
- **Mobile first** — Responsive design starts from mobile
- **Feature-based architecture** — Modules are self-contained
- **Shared packages** — Reusable code lives in `packages/`
- **Zod validation** — All external input validated at boundaries
- **Event-driven** — Modules communicate through typed events

## Deployment

Production deploys to Vercel on push to `main`. Preview deployments for PRs.

## Roadmap

- [x] Sprint 0 — Foundation (monorepo, tooling, layout)
- [x] Epic 1.1 — Architecture expansion (packages, workers, docs)
- [ ] Epic 1.2 — Authentication + database schema
- [ ] Epic 2.0 — First business module
- [ ] Epic 3.0 — AI integration
- [ ] Epic 4.0 — Automation engine
# nexus-os
