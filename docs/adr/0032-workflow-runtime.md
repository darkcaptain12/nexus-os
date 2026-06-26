# ADR-0032: Workflow Runtime Engine

## Status
Accepted

## Context
NEXUS OS needs automated multi-step processes — morning briefings, daily reports, integration syncs. The kernel defined workflow interfaces; this implements the runtime.

## Decision
Implement `@apex-os/workflow-engine` with a DAG-based runtime supporting sequential/parallel execution, conditional branching, delays, variable passing, retry, and cancellation via AbortController.

## Execution Model
1. Entry node starts execution
2. Each node runs its handler with context (variables, previous results)
3. Edges connect nodes — unconditional edges execute sequentially
4. Decision nodes evaluate conditions and branch
5. Parallel nodes fan out to all connected edges simultaneously
6. Delay nodes pause for configured duration
7. Failed nodes retry up to configured attempts
8. Timeout aborts entire execution
