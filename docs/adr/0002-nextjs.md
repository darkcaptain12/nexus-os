# ADR-0002: Next.js 16 with App Router

## Status

Accepted

## Context

The web application needs server-side rendering, API routes, and a modern React framework with strong TypeScript support.

## Decision

Use Next.js 16 with App Router (not Pages Router).

## Why

- **Server Components**: Default server rendering reduces client bundle size and improves performance.
- **App Router**: Layouts, loading states, error boundaries are built into the routing model.
- **Turbopack**: Fast development builds as the codebase grows.
- **API Routes**: Server-side API endpoints without a separate backend.
- **Vercel deployment**: Zero-config production deployment.
- **React 19**: Access to latest React features (Server Actions, use, etc.).

## Consequences

- Pages Router is forbidden — all routing uses `app/` directory.
- Client Components must be explicitly marked with `'use client'`.
- Some third-party libraries may not yet support Server Components.
