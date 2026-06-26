# @apex-os/workflow-engine

Workflow automation runtime for NEXUS OS — sequential/parallel execution, conditional branching, triggers, templates, and execution history.

## Node Types

| Type | Purpose |
|------|---------|
| `action` | Execute handler function |
| `decision` | Conditional branch |
| `parallel` | Fan-out to multiple paths |
| `delay` | Wait for specified duration |
| `wait-event` | Wait for external event |
| `loop` | Repeat nodes |
| `notification` | Send notification |

## Trigger Types

manual, schedule, desktop, browser, file, calendar, webhook, email, ai, api, integration, startup

## Templates

7 production-ready templates: Morning Briefing, EOD Summary, GitHub Check, Gmail Summary, Weekly Report, Calendar Reminder, Idle Notification
