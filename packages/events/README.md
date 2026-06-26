# @apex-os/events

Typed event system with publish/subscribe pattern for inter-module communication.

## Event Domains

- User events (created, updated, deleted)
- Trade events (opened, closed, updated)
- Order events (created, fulfilled, cancelled)
- Agent events (started, completed, failed)
- Memory events (stored, retrieved, deleted)
- Automation events (workflow lifecycle)
- Notification events (sent, failed, read)

## Exports

- `BaseEvent` — Base event interface
- `EventPublisher`, `EventSubscriber` — Pub/sub interfaces
- `EventMap` — Typed event registry
