# @apex-os/automation

Workflow automation engine interfaces for triggers, actions, conditions, and execution management.

## Concepts

- **Workflow** — Named sequence of actions with a trigger
- **Trigger** — What starts a workflow (schedule, event, webhook, manual)
- **Action** — What a step does (API call, notification, AI task, script)
- **Condition** — Optional filter on action execution

## Exports

- `WorkflowEngine` — Execution interface
- `Workflow`, `Trigger`, `Action`, `Condition` — Data types
- `WorkflowExecution` — Runtime state
