# ADR-0021: Second Brain — Personal Memory System

## Status

Accepted

## Context

An AI operating system must remember what the user has done, decided, and learned. Without persistent memory, the AI resets every session. The Second Brain provides structured recall without requiring vector embeddings or LLM APIs.

## Decision

Implement an in-memory personal memory system with timeline, journal, decision log, activity summarizer, project memory, and keyword search. No vector search — pure structured data and text matching.

## Components

- **Memory Store**: Central in-memory store with timeline entries, journals, decisions, summaries, project notes
- **Timeline**: Chronological record of all events from all sources (desktop, tasks, goals, notes, AI, system)
- **Daily Journal**: Auto-generated from timeline entries, split into morning/afternoon/evening/night sections
- **Activity Summarizer**: Hourly summaries of user activity with focus scoring
- **Project Memory**: Per-project history, notes, decisions, related goals/tasks
- **Decision Log**: Records architectural, user, AI, and business decisions with impact level
- **Search**: Keyword, source, date range, and project filtering

## Why Not Vector Search Yet

- Works without any API key — zero external dependencies
- Keyword search is sufficient for structured timeline data
- Vector search adds complexity (embedding generation, pgvector index) best introduced when volume justifies it
- Current system is deterministic and testable

## Consequences

- Memory is in-process — lost on restart until persistence layer is added
- Search is keyword-based — no semantic similarity
- Journal generation is rule-based — AI provider would improve summary quality
- Store grows unbounded — needs size limits and archival for long-running sessions
