# ADR-0010: Context Engine and Token Budget Management

## Status

Accepted

## Context

LLM context windows are finite. Every request must fit system prompts, conversation history, memories, and tool definitions within the token budget. Naive approaches waste context on irrelevant information or truncate important content.

## Decision

Implement a context engine that builds, optimizes, and compresses context frames with explicit token budget allocation across sections.

## Why

- **Token budgeting**: Explicit allocation prevents one section (e.g., memories) from crowding out another (e.g., conversation history).
- **Relevance scoring**: Only the most relevant memories and context are included.
- **Compression**: Long content is summarized to fit within budget without losing critical information.
- **Duplicate detection**: Repeated information across sources is deduplicated.
- **Model-aware**: Token counting is model-specific since different tokenizers produce different counts.

## Consequences

- Context building adds latency to every request — must be optimized.
- Compression quality depends on AI summarization — another cost.
- Token budget ratios may need tuning per use case.
