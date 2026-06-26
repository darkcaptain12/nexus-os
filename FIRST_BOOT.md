# NEXUS OS — First Boot Guide

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase account (optional for dev)

## Quick Start (Development Mode)

```bash
git clone <repo>
cd APEX-OS
pnpm install
pnpm dev
```

Opens at `http://localhost:3000`. Without Supabase configured, runs in mock mode — login page renders but auth is non-functional.

## Full Start (With Supabase)

1. Create Supabase project (see `SUPABASE_SETUP.md`)
2. Copy `.env.local.example` to `.env.local`, fill in values
3. Run migrations
4. `pnpm dev`
5. Register at `/kayit`
6. Login at `/giris`
7. Dashboard loads with live data

## Desktop Agent (Optional)

```bash
pnpm --filter @apex-os/desktop-agent dev
```

Runs on `http://localhost:9120`. Dashboard detects it automatically.

Requires macOS Accessibility permission for window detection.

## Verify System Health

```bash
curl http://localhost:3000/api/system/status    # Kernel status
curl http://localhost:3000/api/system/health     # Health score
curl http://localhost:3000/api/system/metrics    # Metrics + production checklist
curl http://localhost:3000/api/system/database   # Supabase connection
curl http://localhost:3000/api/ai/briefing       # AI briefing
```

## All API Endpoints

### System (7)
- `GET /api/system/status` — Kernel status
- `GET /api/system/health` — Health checks
- `GET /api/system/services` — Service list
- `GET /api/system/kernel` — Kernel details
- `GET /api/system/events` — Event metrics
- `GET /api/system/database` — Database health
- `GET /api/system/metrics` — Metrics + production score

### AI (3)
- `GET /api/ai/briefing` — Daily briefing
- `GET /api/ai/recommendations` — AI recommendations
- `GET /api/ai/status` — AI executive status

### Desktop (5)
- `GET /api/desktop/status` — Desktop agent status
- `GET /api/desktop/activity` — Activity timeline
- `GET /api/desktop/productivity` — Productivity score
- `GET /api/desktop/apps` — App usage
- `POST /api/desktop/sync` — Desktop sync endpoint

### Memory (4)
- `GET /api/memory/timeline` — Memory timeline
- `GET /api/memory/search` — Memory search
- `GET /api/memory/journal` — Daily journal
- `GET /api/memory/projects` — Project memory

### Actions (5)
- `POST /api/actions/execute` — Execute action
- `POST /api/actions/approve` — Approve action
- `POST /api/actions/reject` — Reject action
- `GET /api/actions/history` — Execution history
- `GET /api/actions/pending` — Pending approvals

### Integrations (5)
- `GET /api/integrations` — Provider list
- `POST /api/integrations/connect` — Connect provider
- `POST /api/integrations/disconnect` — Disconnect
- `POST /api/integrations/execute` — Execute provider action
- `GET /api/integrations/health` — Provider health

### Workflows (5)
- `GET /api/workflows` — Workflow list
- `POST /api/workflows` — Create workflow
- `POST /api/workflows/run` — Run workflow
- `POST /api/workflows/enable` — Enable
- `POST /api/workflows/disable` — Disable
- `GET /api/workflows/history` — Execution history
