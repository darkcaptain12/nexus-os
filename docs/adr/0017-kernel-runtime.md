# ADR-0017: Kernel Runtime Implementation

## Status

Accepted

## Context

The kernel architecture was defined in Epic 2.0 with 18 subsystems as pure interfaces. A running system needs concrete implementations that can boot, process commands and events, schedule jobs, and monitor health.

## Decision

Implement the kernel runtime as in-memory implementations that conform to the existing interfaces. No external dependencies beyond Pino for logging.

## Implementation Decisions

### In-Memory First
All state (event store, command queue, scheduler, health) is held in memory. This is correct for a personal OS — single-user, single-process. Persistent backing stores (PostgreSQL, Redis) can be swapped in later without changing the interfaces.

### Boot Sequence
The lifecycle manager executes boot steps in order: configuration → container → service registry → event runtime → command bus → query bus → scheduler → health monitor → state manager. Critical step failures halt the boot and enter safe mode.

### DI Container
Factory-based registration with four scopes (singleton, transient, scoped, lazy). Circular dependency detection on resolve, not on register — catches real cycles, not false positives from registration order.

### Event Runtime
Publish/subscribe with replay from in-memory event store. Failed handlers retry up to `maxRetries`, then dead-letter. Delayed and scheduled events use `setTimeout` — adequate for single-process.

### Command/Query Bus
Middleware pipelines wrap handlers. Commands support retry, cancellation via middleware context abort, and dead letter queue. Queries support in-memory caching with TTL and invalidation.

### Health Monitor
Pluggable health checkers registered by name. Built-in checks for memory usage, event runtime, and command bus. Score calculated as weighted average — 100 = all healthy, 0 = all unhealthy. Alerts auto-created on unhealthy, auto-resolved on recovery.

## Consequences

- All state is lost on process restart — acceptable for development, needs persistence for production.
- Scheduler uses `setInterval` — no cron expression parsing yet.
- No distributed locking — single-process assumption.
- No workflow runtime or task engine implementation yet.
