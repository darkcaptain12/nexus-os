# ADR-0007: Agent Orchestration Architecture

## Status

Accepted

## Context

Complex tasks require multiple AI agents working together — a planner decomposes goals, executors carry out steps, reviewers validate output. We need an orchestration system that supports single-agent, parallel, sequential, pipeline, and graph execution modes.

## Decision

Implement a multi-agent orchestration system with typed agent definitions, an execution engine with queue management, and dependency-aware graph execution.

## Why

- **Single-agent is insufficient**: Real tasks require planning, execution, and review — separate concerns for separate agents.
- **Dependency graphs**: Some tasks must run sequentially, others can parallelize. The system must model these relationships.
- **Resource management**: Concurrent execution needs queueing, prioritization, and cancellation support.
- **Composability**: New agent types can be added without modifying the orchestrator.
- **Observability**: Every execution is logged with reasoning traces, tool calls, and token usage.

## Consequences

- Agent definitions must declare capabilities, permissions, and resource requirements upfront.
- Orchestration plans can be inspected and approved before execution.
- Execution failures are retried or escalated based on policy.
