# ADR-0001: Monorepo Architecture

## Status

Accepted

## Context

APEX OS spans multiple applications (web, mobile, desktop, browser extension, MCP server) and shared packages (types, UI, utils, AI, events). Code sharing, consistent tooling, and atomic changes across packages are critical.

## Decision

Use pnpm workspaces monorepo with Turborepo for build orchestration.

## Why

- **Code sharing**: Shared packages (`@apex-os/*`) are consumed by all apps without publishing to npm.
- **Atomic changes**: A type change in `packages/types` and its consumers can ship in one PR.
- **Consistent tooling**: Single ESLint, Prettier, TypeScript config across all packages.
- **Build caching**: Turborepo caches unchanged packages, keeping CI fast as the repo grows.
- **Developer experience**: One `pnpm install`, one `pnpm dev`, everything works.

## Consequences

- Larger repository size over time.
- CI must be configured to build only affected packages.
- New developers need to understand workspace structure.
