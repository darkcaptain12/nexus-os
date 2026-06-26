# @apex-os/integration-hub

Universal integration gateway for NEXUS OS. Every external service connects through standardized providers with credential management, connection health checks, rate limiting, and action registration.

## Providers

| Provider | Category | Actions |
|----------|----------|---------|
| GitHub | code | listRepos, getIssues, getPulls, createIssue, createPR |
| Gmail | email | listMessages, send, search |
| Google Calendar | calendar | listEvents, createEvent, deleteEvent |
| MCP | mcp | discover, execute |
| HTTP | http | get, post, put, delete |

## Architecture

```
Provider Registry → Credential Manager → Connection Manager → Rate Limiter → Execute
```
