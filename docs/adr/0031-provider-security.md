# ADR-0031: Provider Security Model

## Status
Accepted

## Context
External service credentials (API keys, OAuth tokens) must be handled securely. Credentials must never reach the browser client.

## Decision
- CredentialManager stores credentials server-side in memory (production: encrypted in Supabase)
- OAuth tokens refreshed automatically before expiry
- Rate limiter prevents credential abuse
- Every execution audited with provider, action, duration, result
- Risk levels on provider actions feed into Action Engine approval system

## Credential Types
- OAuth2: access + refresh token with expiry
- API Key: static key
- Bearer: JWT or personal access token
- Basic: username + password (base64)
