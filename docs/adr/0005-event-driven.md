# ADR-0005: Event-Driven Architecture

## Status

Accepted

## Context

APEX OS modules (trading, e-commerce, AI, automation) must communicate without tight coupling. A trade execution may trigger a notification, update memory, and log an audit event.

## Decision

Use an event-driven architecture with typed events and publish/subscribe pattern.

## Why

- **Loose coupling**: Modules don't import each other. They publish events, subscribers react.
- **Extensibility**: Adding a new reaction to an event requires zero changes to the publisher.
- **Audit trail**: Every event is a record of what happened, enabling replay and debugging.
- **Async processing**: Events can be processed by background workers without blocking the UI.
- **Type safety**: TypeScript event maps ensure publishers and subscribers agree on payload shapes.

## Consequences

- Eventual consistency — subscribers may process events with delay.
- Debugging requires event tracing tools.
- Event schema versioning needed as the system evolves.
