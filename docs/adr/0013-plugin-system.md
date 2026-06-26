# ADR-0013: Plugin System for Extensibility

## Status
Accepted

## Context
APEX OS must support new integrations (Shopify, Binance, email providers) without modifying the kernel or existing modules. Third-party and user-created extensions need a safe, managed way to plug in.

## Decision
Plugin system with manifests, dependency validation, lifecycle hooks, permission-based sandboxing, and health monitoring.

## Why
- **Open/closed principle**: Kernel is closed for modification, open for extension via plugins.
- **Safety**: Plugins declare required permissions; sandbox restricts access.
- **Lifecycle**: Install → enable → disable → uninstall with hooks at each stage.
- **Health**: Plugin health is monitored — degraded plugins can be auto-disabled.
- **Versioning**: Dependency validation prevents incompatible plugin combinations.

## Consequences
- Plugin API surface must be stable — breaking changes affect all plugins.
- Sandbox enforcement adds runtime overhead.
- Plugin ecosystem requires documentation and testing tools.
