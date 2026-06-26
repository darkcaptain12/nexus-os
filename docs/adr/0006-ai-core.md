# ADR-0006: AI as Central Nervous System

## Status

Accepted

## Context

APEX OS is a personal AI operating system. Every module — trading, e-commerce, automation, memory — must interact through AI. The architecture must treat AI not as a feature but as the central orchestration layer.

## Decision

AI is the center of the system. Every module communicates through the AI layer, never directly with other modules. The pipeline is: Voice/Input → AI Router → Agent Orchestrator → Memory Engine → Tool Registry → Event Bus → Modules.

## Why

- **Unified interface**: Users interact with one AI layer that routes to the right module.
- **Context awareness**: AI maintains conversation context, memory, and user preferences across modules.
- **Intelligent routing**: AI selects the right provider, model, and agent based on task requirements.
- **Safety enforcement**: All actions pass through safety checks before execution.
- **Observability**: Centralized telemetry tracks cost, latency, and quality across all AI operations.

## Consequences

- Every module depends on the AI package for orchestration.
- Higher complexity in the AI layer — mitigated by clear subdomain separation.
- All AI provider costs are centralized and trackable.
- Module development requires understanding the agent/tool contract system.
