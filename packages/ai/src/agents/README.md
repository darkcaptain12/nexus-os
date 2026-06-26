# Agents

Agent definitions, orchestration, and execution management.

## Agent Types

- **Single** — Standalone agent executing a task
- **Planner** — Decomposes goals into execution plans
- **Executor** — Executes specific steps from a plan
- **Reviewer** — Reviews and validates agent output
- **Coordinator** — Manages multi-agent collaboration

## Orchestration Modes

- **single** — One agent, one task
- **parallel** — Multiple agents, independent tasks
- **sequential** — Agents execute in order, output feeds forward
- **pipeline** — Chained agents with data transformation
- **graph** — Dependency graph with conditional branching
