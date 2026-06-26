# AI Memory Engine

Hierarchical memory system for AI agents — working, short-term, long-term, semantic, conversation, knowledge, project, document, and relationship memory.

## Memory Types

- **Working** — Active session context, evicted on session end
- **Short** — Recent interactions, decays over hours
- **Long** — Persistent knowledge, never auto-expires
- **Semantic** — Embedding-indexed for similarity search
- **Conversation** — Turn-by-turn chat history with summaries
- **Knowledge** — Structured facts with citations
- **Project** — Project-specific context and decisions
- **Document** — Chunked documents with embeddings
- **Relationship** — Entity-to-entity connections

## Lifecycle

Entries have importance scores that decay over time. Low-importance expired entries are automatically cleaned up. Consolidation merges related entries to save tokens.
