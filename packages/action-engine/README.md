# @apex-os/action-engine

Action execution system for NEXUS OS — registry, validation, approval workflow, execution queue, and rollback management.

## Risk Levels

| Level | Behavior |
|-------|----------|
| `low` | Auto-approved, executes immediately |
| `medium` | Configurable — default requires approval |
| `high` | Always requires user approval |
| `critical` | Always requires explicit confirmation, AI never auto-executes |

## Components

- **ActionRegistry** — Register actions with definitions and handlers
- **ActionValidator** — Validate parameters against definitions
- **ApprovalManager** — Risk-based approval workflow with expiration
- **ExecutionQueue** — Priority queue with concurrency limits and retry
- **RollbackManager** — Undo completed actions where supported
- **ActionEngine** — Orchestrates all components

## Usage

```typescript
import { ActionEngine } from '@apex-os/action-engine';

const engine = new ActionEngine();
engine.registerAction(definition, handler);
const execution = await engine.submit(request);
```
