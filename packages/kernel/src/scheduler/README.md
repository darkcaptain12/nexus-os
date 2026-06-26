# Scheduler

Job scheduling with cron expressions, intervals, one-time execution, conditional triggers, and event-based activation. Calendar-aware with timezone, weekend, and holiday support.

## Schedule Types
- **cron** — Standard cron expressions (e.g., `0 9 * * MON-FRI`)
- **interval** — Fixed interval in milliseconds
- **one-time** — Execute once at a specific time
- **conditional** — Polling-based, execute when condition is true
- **event-based** — Triggered by a kernel event
