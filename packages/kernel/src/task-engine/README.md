# Task Engine

Queue-based task processing with priority scheduling, dependency resolution, worker pools, progress reporting, and checkpointing.

## Features
- Priority queue with dependency ordering
- Configurable concurrency per queue
- Worker pool management (spawn, terminate, scale)
- Progress reporting from within handlers
- Checkpoint/resume for long-running tasks
- Dead letter queue for exhausted retries
