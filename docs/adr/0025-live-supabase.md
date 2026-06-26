# ADR-0025: Live Supabase Integration

## Status
Accepted

## Context
NEXUS OS had all persistence implemented against in-memory stores and mock Supabase clients. Production requires real database persistence that survives restarts, with proper health monitoring and startup validation.

## Decision
Implement production-grade Supabase integration: environment validation, startup health checks, database monitoring API, desktop sync endpoint with idempotency, background jobs for journal/cleanup, and realtime hooks for live dashboard updates.

## Components

### Environment Validation
Application validates required env vars at startup. Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` triggers development mock mode with clear warning.

### Startup Checks
- Environment vars present
- Supabase connection + latency
- Tables exist (migration verification)
- Auth enabled
- Storage accessible
- Realtime enabled
- RLS enabled

### Desktop Sync Endpoint
`POST /api/desktop/sync` accepts batches (max 100), validates auth, stores with user_id from JWT. Idempotency via client-provided key.

### Background Jobs
- Daily journal generation from activity + task + goal data
- Weekly summary with top apps, completed work, progress
- Expired memory cleanup

### Realtime Hooks
`useRealtime` and `useRealtimeList` hooks subscribe to Supabase postgres_changes. Widgets update automatically on INSERT/UPDATE/DELETE.

## Consequences
- Application requires Supabase project for production features
- Development mode works without Supabase (mock client)
- Database monitoring endpoint exposes no secrets (connection status only)
- Background jobs run on-demand via API — no Supabase Edge Functions required
