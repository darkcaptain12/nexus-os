# ADR-0011: Operating System Kernel Architecture

## Status
Accepted

## Context
APEX OS modules (AI, trading, e-commerce, automation) need shared infrastructure — service discovery, task processing, scheduling, state management. Without a kernel, each module reinvents these primitives.

## Decision
Build a kernel package that provides the runtime foundation: DI container, service registry, CQRS buses, event runtime, workflow engine, task engine, scheduler, plugin system, lifecycle management, health monitoring, locks, and state management.

## Why
- **Single runtime**: All modules run on one kernel. No redundant infrastructure.
- **Clean boundaries**: Modules interact through kernel buses, not direct imports.
- **Testability**: Kernel subsystems are interface-defined — mockable in tests.
- **Lifecycle control**: Kernel manages ordered boot, graceful shutdown, and recovery.
- **Extensibility**: New capabilities added via plugins without kernel changes.

## Consequences
- Kernel is a foundational dependency — must be stable and backward-compatible.
- All modules must be designed as kernel services or plugins.
- Kernel complexity must be justified by usage — avoid premature abstraction.
