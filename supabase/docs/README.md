# APEX OS Database Documentation

## Schema Overview

| Domain | Tables | Description |
|--------|--------|-------------|
| Identity | 8 | Users, profiles, devices, sessions, API keys, roles, permissions |
| AI Agents | 4 | Agent definitions, runs, tool calls, metrics |
| Memory | 10 | Memories, embeddings, chunks, links, conversations, documents, knowledge |
| Goals & Tasks | 4 | Goals, projects, tasks, dependencies |
| Workflows | 6 | Definitions, nodes, edges, runs, logs, templates |
| Notifications | 4 | Notifications, channels, templates, delivery logs |
| Trading | 7 | Exchanges, portfolios, positions, orders, signals, strategies, risk |
| Commerce | 5 | Shops, products, customers, orders, suppliers |
| Finance | 3 | Transactions, budgets, subscriptions |
| Calendar | 2 | Events, reminders |
| Health | 1 | Health metrics |
| Knowledge Base | 3 | Notes, collections, attachments |
| Desktop | 4 | Activity logs, clipboard, screenshots, file index |
| Browser | 2 | History, bookmarks |
| Automation | 3 | Automations, executions, execution logs |
| Kernel | 4 | Events, commands, services, plugins |
| Voice | 2 | Sessions, commands |
| Audit | 4 | Audit logs, security events, login history, API logs |

## Conventions

- **Primary keys**: UUID via `gen_random_uuid()`
- **Timestamps**: `created_at`, `updated_at` on every table
- **Soft delete**: `deleted_at` column, never hard delete
- **Naming**: `snake_case` for all identifiers
- **Indexes**: On foreign keys, frequently filtered columns, and search columns
- **RLS**: Enabled on every table, user sees own data
- **Enums**: PostgreSQL enums for fixed-set columns
- **JSONB**: For flexible/nested data (metadata, config, items)
- **pgvector**: 1536-dimension embeddings for semantic search

## Vector Search

Three vector search functions available:
- `search_memories()` — Search memory embeddings with cosine similarity
- `search_documents()` — Search document chunks
- `search_knowledge()` — Search knowledge base
- `hybrid_search_memories()` — Combined full-text + vector search

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| avatars | Yes | User profile pictures |
| documents | No | Uploaded documents |
| screenshots | No | Desktop screenshots |
| voice | No | Voice recordings |
| exports | No | Data exports |
| backups | No | Database backups |
| attachments | No | File attachments |

## RLS Strategy

- Users see only their own data (owner_id/user_id = auth user)
- Nested resources (positions, products) checked via parent ownership
- Audit tables are read-only for users
- Service role bypasses all RLS
