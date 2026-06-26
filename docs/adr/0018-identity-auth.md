# ADR-0018: Identity Platform with Supabase Auth

## Status

Accepted

## Context

NEXUS OS needs authentication before any business module can be implemented. Users must register, login, logout, and reset passwords. All routes except auth pages must be protected.

## Decision

Use Supabase Auth with `@supabase/ssr` for Next.js 16 SSR integration. Server-side session management via cookies. Protected routes enforced at two levels: middleware for redirects, layout for server component guards.

## Implementation

- **Auth flows**: Email/password signup, login, logout, password reset
- **Session management**: Cookie-based via `@supabase/ssr`, refresh handled automatically
- **Middleware**: Redirects unauthenticated users to `/giris`, authenticated users away from auth pages
- **Dashboard layout**: Server Component guard — checks `getUser()` and redirects
- **Mock client**: Graceful degradation when Supabase env vars not configured
- **Language**: All UI in Turkish (tr-TR)

## Consequences

- Supabase project required for full auth functionality
- Mock client allows development without Supabase connection
- RLS policies depend on `auth.uid()` matching `users.auth_id`
- Email verification flow requires Supabase email provider configuration
