# Event Runtime

Full event system runtime extending the base `@apex-os/events` package with event store, replay, versioning, dead letter queue, delayed/scheduled events, and consumer groups.

## Beyond Basic Pub/Sub
- **Event Store** — Persistent append-only log with stream-based reads
- **Replay** — Re-process historical events for rebuilding projections
- **Versioning** — Upcast events across schema versions
- **Dead Letter Queue** — Failed events captured for investigation and retry
- **Delayed/Scheduled** — Events dispatched at a future time
- **Consumer Groups** — Multiple subscribers, only one processes each event
