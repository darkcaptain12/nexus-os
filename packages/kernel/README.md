# @apex-os/kernel

Operating System Kernel — the runtime that powers every module in APEX OS. Provides dependency injection, service management, CQRS buses, event sourcing, workflow execution, task processing, scheduling, plugin management, lifecycle control, and health monitoring.

## Architecture

```
Kernel
  ↓
Service Registry ──→ Service discovery, dependency graph
  ↓
DI Container ──→ Singleton / Transient / Scoped / Lazy
  ↓
Command Bus ──→ CQRS write side + middleware pipeline
Query Bus ──→ CQRS read side + caching + projections
  ↓
Event Runtime ──→ Pub/sub + event store + replay + versioning
  ↓
Workflow Runtime ──→ DAG execution + checkpoints + rollback
Task Engine ──→ Queue + workers + priorities + dependencies
  ↓
Scheduler ──→ Cron + interval + one-time + event-based
  ↓
Plugin Manager ──→ Install + enable + sandbox + health
Module Loader ──→ Lazy load + hot reload + isolation
  ↓
Lifecycle Manager ──→ Boot + shutdown + suspend + safe mode
Health Monitor ──→ Heartbeat + metrics + alerts + scoring
  ↓
Lock Manager ──→ Mutex + semaphore + distributed + TTL
State Manager ──→ Scoped state + snapshots + recovery
  ↓
Execution Engine ──→ Pipeline + compensation + checkpoints
```

## Subsystems

| Module | Purpose |
|--------|---------|
| `core/` | Kernel interface, ports, foundational types |
| `runtime/` | Runtime info, config, system events |
| `container/` | Dependency injection with 4 scopes |
| `services/` | Service lifecycle management |
| `registry/` | Service catalog with dependency graph |
| `loader/` | Dynamic module loading |
| `plugins/` | Plugin installation and sandboxing |
| `scheduler/` | Cron, interval, and event-based scheduling |
| `lifecycle/` | Boot, shutdown, suspend, recovery |
| `health/` | Health checks, metrics, alerts |
| `command-bus/` | CQRS commands with middleware |
| `query-bus/` | CQRS queries with caching |
| `event-runtime/` | Event store, replay, versioning |
| `workflow-runtime/` | DAG workflows with compensation |
| `task-engine/` | Queue-based task processing |
| `execution/` | Pipeline execution with rollback |
| `locks/` | Resource locking and semaphores |
| `state/` | Scoped state with snapshots |
