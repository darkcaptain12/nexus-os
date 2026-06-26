# Workflow Runtime

DAG-based workflow execution with decision nodes, loops, parallel/sequential paths, checkpoints, rollback, and compensation.

## Node Types
- **action** — Execute a handler
- **decision** — Conditional branching
- **loop** — Iterate until condition met
- **parallel** — Fan-out to multiple paths
- **sequential** — Ordered execution
- **wait** — Timer or event wait
- **checkpoint** — Persist state for recovery
- **compensation** — Undo on rollback
