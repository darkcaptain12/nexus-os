# Service Registry

Central catalog of all kernel services with dependency graph analysis, topological ordering for boot/shutdown, and health status tracking.

## Features
- Service registration with metadata (version, owner, permissions, exports)
- Dependency graph with cycle detection
- Topological sort for ordered startup/shutdown
- Queryable by status, owner, tag, or capability
- Snapshot/restore for state persistence
