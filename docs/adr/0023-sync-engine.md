# ADR-0023: Sync Engine for Offline-First Data Flow

## Status
Accepted

## Context
Desktop Agent runs as a separate process. It generates activity data that must reach Supabase even when the network is intermittent.

## Decision
Implement a sync engine with in-memory queue, batch flushing, retry with max attempts, and offline mode flag. Desktop Agent has its own sync client that buffers entries and flushes via HTTP to the web API, which then persists to Supabase.

## Pipeline
Desktop Agent → Local Queue → HTTP POST → Web API → Supabase

## Why
- **No data loss**: Queue holds entries until successfully flushed.
- **Batching**: Reduces HTTP requests and Supabase round-trips.
- **Retry**: Failed batches re-enqueue with retry counter; dead-letter after max retries.
- **Offline**: Agent continues collecting when offline; syncs when reconnected.
