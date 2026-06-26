# ADR-0024: Supabase Realtime for Live Dashboard Updates

## Status
Accepted

## Context
Dashboard widgets should reflect database changes immediately — new tasks, memory entries, desktop activity — without polling.

## Decision
Use Supabase Realtime with a `RealtimeManager` that subscribes to postgres_changes on specific tables. Client components receive change events and update state.

## Why
- **Instant updates**: No polling delay — changes appear within seconds.
- **Selective subscriptions**: Subscribe only to tables the current view needs.
- **Cleanup**: Manager tracks subscriptions and unsubscribes on component unmount.
- **RLS-compatible**: Realtime respects row-level security — users only receive their own data changes.
