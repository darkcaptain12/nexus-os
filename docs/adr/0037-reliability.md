# ADR-0037: Reliability Engineering

## Status
Accepted

## Context
Production systems must handle failures gracefully — retry transient errors, classify fatal vs recoverable, rate-limit to prevent abuse.

## Decision
- NexusError classifies errors as retryable/non-retryable
- isRetryable() detects timeouts, rate limits, connection resets
- Security headers applied to all responses
- Rate limiter with per-key sliding window
- Configuration validated on startup with clear error messages
- Production checklist verifies deployment readiness
