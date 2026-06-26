# ADR-0029: Integration Hub — Universal Service Gateway

## Status
Accepted

## Context
NEXUS OS must integrate with external services (GitHub, Gmail, Calendar, MCP servers). Without a central gateway, each module would implement its own HTTP client, auth handling, and error management.

## Decision
Create `@apex-os/integration-hub` as the single gateway. Every external service implements the `Provider` interface with connect/disconnect/health/execute/getActions. The hub manages credentials, connections, rate limiting, and health checks.

## Why
- **Single interface**: All providers share the same API — register, connect, execute.
- **Credential isolation**: Tokens stored in CredentialManager, never exposed to client code.
- **Health monitoring**: Automatic health checks every 5 minutes, connection state tracked.
- **Rate limiting**: Per-provider configurable limits prevent API abuse.
- **Action discovery**: AI Executive queries the registry to know what actions are available.
