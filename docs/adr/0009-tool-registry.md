# ADR-0009: Universal Tool Registry

## Status

Accepted

## Context

AI agents need to interact with external systems — databases, APIs, file systems, browsers, trading platforms. Each tool has different permissions, rate limits, and execution characteristics.

## Decision

Implement a universal tool registry where every external capability is registered as a typed tool with category, permissions, parameters, health status, and execution mode.

## Why

- **Discoverability**: Agents can query available tools by category or capability.
- **Permission enforcement**: Tools declare required permissions; execution is gated by RBAC.
- **Health monitoring**: Degraded or unavailable tools are excluded from agent tool lists.
- **Validation**: Tool parameters are validated before execution, preventing runtime errors.
- **Rate limiting**: Per-tool rate limits prevent abuse of external APIs.
- **Extensibility**: Adding a new integration means registering a new tool — no orchestrator changes.

## Consequences

- Every external integration must be wrapped as a registered tool.
- Tool health checks add background overhead.
- Parameter validation schemas must be maintained alongside tool implementations.
