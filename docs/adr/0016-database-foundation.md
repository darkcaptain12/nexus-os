# ADR-0016: PostgreSQL Database Foundation with pgvector

## Status

Accepted

## Context

APEX OS needs a database that supports relational data, vector embeddings for AI memory, real-time subscriptions, row-level security, and file storage — without managing separate infrastructure for each.

## Decision

Use Supabase (PostgreSQL 17) with pgvector extension as the single database layer. 71 tables across 18 domains, with RLS on every table, vector indexes for semantic search, and audit triggers on critical tables.

## Why

- **Single database**: PostgreSQL handles relational, vector, full-text, and JSONB data in one system.
- **pgvector**: Native vector similarity search eliminates the need for a separate vector database.
- **RLS**: Row-level security enforces data isolation at the database level — impossible to bypass from application code.
- **Audit triggers**: Automatic change tracking on critical tables without application-level logging.
- **Hybrid search**: Combined full-text (pg_trgm) and vector (cosine similarity) search in a single query.
- **Soft deletes**: Data recovery and compliance — nothing is permanently lost without explicit purge.
- **Supabase integration**: Auth, real-time subscriptions, storage, and edge functions from one platform.

## Consequences

- All queries must account for `deleted_at is null` filter (soft deletes).
- RLS policies must be maintained when adding new tables.
- Vector index rebuilds needed when embedding dimensions change.
- Audit log table will grow — needs retention policy.
- 1536-dimension embeddings consume ~6KB per row — storage planning needed for large memory stores.
