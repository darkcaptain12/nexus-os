# Dependency Injection Container

Inversion-of-control container supporting singleton, transient, scoped, and lazy bindings with circular dependency detection.

## Scopes
- **Singleton** — One instance for the container lifetime
- **Transient** — New instance on every resolve
- **Scoped** — One instance per scope (e.g., per request)
- **Lazy** — Deferred creation until first access

## Features
- Factory-based registration
- Value registration for constants
- Scoped containers with automatic disposal
- Circular dependency detection at validation time
- Service discovery by tag or scope
