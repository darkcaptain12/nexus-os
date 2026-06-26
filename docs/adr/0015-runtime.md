# ADR-0015: Lifecycle Manager with Recovery Modes

## Status
Accepted

## Context
A personal AI operating system runs continuously. It must handle crashes, maintenance windows, and partial failures without losing state or corrupting data.

## Decision
Lifecycle manager with defined phases (boot → running → maintenance → shutdown), graceful shutdown with drain, safe mode for recovery, and state snapshot/restore.

## Why
- **Graceful shutdown**: Services drain queues and save state before exit.
- **Safe mode**: Minimal services boot for diagnostics when something breaks.
- **State recovery**: Snapshots enable rollback after failed updates.
- **Maintenance mode**: Services pause processing while admin operations run.
- **Observable transitions**: Phase changes emit events for monitoring.

## Consequences
- All services must implement cleanup logic for graceful shutdown.
- State snapshots consume storage — need retention policies.
- Recovery plans must be defined and tested per service.
