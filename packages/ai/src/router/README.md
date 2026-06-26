# AI Router

Intelligent provider selection with fallback chains, cost/latency estimation, rate limiting, and token budgeting.

## Responsibilities

- Select optimal provider and model based on task requirements
- Fallback to alternative providers on failure
- Retry with exponential backoff
- Estimate cost before execution
- Track latency per provider/model
- Enforce rate limits and token budgets
- Select appropriate context window size

## Routing Strategies

- **cost-optimized** — Minimize cost per request
- **latency-optimized** — Minimize response time
- **quality-optimized** — Use highest-capability model
- **fallback** — Try providers in configured order
- **round-robin** — Distribute load across providers
