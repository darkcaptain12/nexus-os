# ADR-0026: Action Engine

## Status
Accepted

## Context
NEXUS OS can observe (desktop agent), think (AI executive), and decide (rule engine). It needs the ability to act — execute operations on behalf of the user with proper safety controls.

## Decision
Create `@apex-os/action-engine` package with registry, validation, approval workflow, execution queue with retry, and rollback management. Every action has a risk level that determines whether it executes automatically or requires approval.

## Why
- **Registry**: All executable actions declared upfront with parameters, permissions, timeouts
- **Risk-based approval**: LOW auto-executes, HIGH/CRITICAL always require user confirmation
- **AI safety**: AI-sourced HIGH/CRITICAL actions ALWAYS require approval — no bypass
- **Queue**: Priority-based with concurrency limits, retry, dead letter queue
- **Rollback**: Undo completed actions where handler supports it
- **Audit**: Every execution tracked with status, duration, errors
