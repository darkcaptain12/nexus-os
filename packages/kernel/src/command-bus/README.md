# Command Bus

CQRS write-side bus with typed commands, handler registration, middleware pipeline, retry, dead letter queue, and scheduled dispatch.

## Pipeline
1. Command dispatched
2. Middleware chain executes (logging, validation, auth)
3. Handler processes command
4. Result returned or command sent to dead letter queue on failure

## Features
- Typed command/handler registration
- Middleware pipeline (logging, validation, auth, rate-limiting)
- Priority-based processing
- Retry with configurable attempts
- Dead letter queue for failed commands
- Scheduled command dispatch
