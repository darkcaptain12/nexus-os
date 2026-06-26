# ADR-0022: Repository Pattern for Supabase Persistence

## Status
Accepted

## Context
All NEXUS OS data was stored in-memory — lost on restart. Production requires durable storage with consistent access patterns, pagination, and soft-delete support.

## Decision
Implement a repository layer with a generic `BaseRepository<T>` providing CRUD, pagination, soft-delete, and search. Domain repositories (Memory, Task, Goal, Desktop, Journal, Decision, Project) extend the base with domain-specific queries. All repositories accept a Supabase client — mockable in tests.

## Why
- **Consistency**: Every table follows the same access pattern (findById, findMany, create, update, softDelete, count, search).
- **Testability**: Repositories accept a client via constructor — inject a mock for unit tests, real client for integration.
- **Pagination**: Cursor-based via `.range()` built into base.
- **Soft delete**: Base handles `deleted_at` filtering — domain code never forgets the filter.
- **Graceful fallback**: AI Executive catches repository errors and falls back to empty summaries.
