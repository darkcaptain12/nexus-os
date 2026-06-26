# ADR-0036: Observability Stack

## Status
Accepted

## Context
Without metrics and tracing, production issues are invisible until users report them.

## Decision
In-process MetricsCollector with counters, timers, request traces, and slow operation detection. Exposed via GET /api/system/metrics. System dashboard at /system shows real-time health, CPU, memory, uptime, and service status.

## Components
- Counters: requests.total, requests.errors, requests.slow
- Timers: start/end with automatic slow detection (>1000ms)
- Traces: method, path, status, duration, correlationId
- Health: 8 checks (kernel, database, action engine, integration hub, workflows, memory, CPU, desktop agent)
