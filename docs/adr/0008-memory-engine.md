# ADR-0008: Hierarchical Memory Architecture

## Status

Accepted

## Context

AI agents need memory that persists across conversations, supports semantic search, and respects privacy boundaries. Different use cases require different memory lifetimes and access patterns.

## Decision

Implement a 9-tier hierarchical memory system: working, short-term, long-term, semantic, conversation, knowledge, project, document, and relationship memory.

## Why

- **Working memory**: Active session context that is evicted when the session ends. Fast access, bounded size.
- **Short/long-term**: Natural decay model — recent memories are weighted higher, important memories persist.
- **Semantic memory**: Embedding-indexed for similarity search — "find related information" rather than exact lookup.
- **Conversation memory**: Turn-by-turn history with automatic summarization for long conversations.
- **Knowledge memory**: Structured facts with citations and confidence scores.
- **Relationship memory**: Entity-to-entity connections for building a knowledge graph.
- **Lifecycle management**: Automatic expiry, importance decay, and consolidation keep memory efficient.

## Consequences

- Embedding generation costs must be budgeted.
- Memory privacy levels (public/private/system) must be enforced at query time.
- Consolidation requires AI to merge related memories — another AI cost.
