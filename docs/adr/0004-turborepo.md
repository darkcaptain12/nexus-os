# ADR-0004: Turborepo for Build Orchestration

## Status

Accepted

## Context

With 15+ packages, 5+ apps, and 6+ workers, build times will grow. Need intelligent caching and parallel execution.

## Decision

Use Turborepo for task orchestration across the monorepo.

## Why

- **Build caching**: Only rebuilds what changed. Local and remote caching.
- **Parallel execution**: Independent packages build simultaneously.
- **Dependency graph**: Understands `dependsOn` relationships between packages.
- **Minimal config**: Single `turbo.json` replaces custom build scripts.
- **pnpm integration**: First-class support for pnpm workspaces.

## Consequences

- `turbo.json` must be updated when adding new task types.
- Remote caching requires Vercel account (optional).
- All package scripts must follow consistent naming (`build`, `lint`, `type-check`).
