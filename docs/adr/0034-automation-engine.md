# ADR-0034: Trigger-Based Automation

## Status
Accepted

## Context
Workflows need triggers beyond manual execution — schedules, events, webhooks, desktop activity. The trigger registry makes trigger types discoverable and configurable.

## Decision
12 trigger types with typed config schemas. Triggers are declarative — the workflow stores trigger config, and the scheduler/event system evaluates them. Schedule triggers support cron, timezone, business hours, and weekend exclusion.

## Trigger Types
manual, schedule, desktop, browser, file, calendar, webhook, email, ai, api, integration, startup
