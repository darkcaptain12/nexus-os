# ADR-0003: Supabase as Database and Auth Provider

## Status

Accepted

## Context

APEX OS needs a database, authentication, real-time subscriptions, and file storage. Building each from scratch would delay core feature development.

## Decision

Use Supabase (hosted PostgreSQL) for database, auth, real-time, and storage.

## Why

- **PostgreSQL**: Full SQL power, JSONB for flexible schemas, pgvector for embeddings.
- **Built-in auth**: Email, OAuth, magic links without custom implementation.
- **Real-time**: WebSocket subscriptions for live data updates.
- **Row Level Security**: Database-level access control, not application-level.
- **Storage**: File uploads with CDN and transformations.
- **Self-hostable**: Can migrate to self-hosted Supabase if needed.

## Consequences

- Vendor dependency on Supabase (mitigated by PostgreSQL portability).
- RLS policies must be written for every table.
- Migration management via Supabase CLI.
