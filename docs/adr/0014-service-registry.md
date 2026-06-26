# ADR-0014: Service Registry with Dependency Graph

## Status
Accepted

## Context
Kernel services depend on each other (e.g., task engine depends on scheduler, which depends on event runtime). Boot order matters — starting services in the wrong order causes failures.

## Decision
Service registry with metadata, dependency graph analysis, topological sort for ordered startup/shutdown, and health status tracking.

## Why
- **Ordered boot**: Topological sort ensures dependencies start before dependents.
- **Ordered shutdown**: Reverse topological order prevents dependent services from losing their dependencies.
- **Cycle detection**: Circular dependencies caught at registration time, not at runtime.
- **Health tracking**: Registry knows which services are healthy, degraded, or failed.
- **Discoverability**: Services can find each other by capability, not by name.

## Consequences
- All services must declare dependencies upfront.
- Late registration (after boot) requires careful dependency resolution.
