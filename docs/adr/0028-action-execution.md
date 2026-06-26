# ADR-0028: Action Execution Pipeline

## Status
Accepted

## Context
Actions must execute reliably with timeout, retry, concurrency control, and rollback support.

## Pipeline
1. Submit → validate parameters
2. Check risk level → auto-approve or create approval request
3. Enqueue with priority
4. Dequeue respecting concurrency limit
5. Execute with timeout via AbortController
6. On success → complete + record result
7. On failure → retry (up to maxAttempts) or dead-letter
8. On rollback request → call handler.rollback() if supported

## Concurrency
Default max 5 concurrent executions. Configurable per engine instance. Queue holds excess with priority ordering.
