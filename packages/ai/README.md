# @apex-os/ai

AI Core — the central nervous system of APEX OS. Multi-provider routing, agent orchestration, hierarchical memory, context management, tool registry, planning, reasoning, evaluation, safety, and telemetry.

## Architecture

```
Voice/Input
    ↓
AI Router ──→ Provider Selection / Fallback / Cost Estimation
    ↓
Agent Orchestrator ──→ Single / Parallel / Sequential / Pipeline / Graph
    ↓
Memory Engine ──→ Working / Short / Long / Semantic / Knowledge
    ↓
Tool Registry ──→ 12 categories (filesystem, trading, shopify, mcp, ...)
    ↓
Event Bus ──→ Typed events for all AI operations
    ↓
Safety Guard ──→ Permission / Approval / Audit / Rate Limit
```

## Subsystems

| Module | Purpose |
|--------|---------|
| `core/` | Foundation types and system-level interfaces |
| `router/` | Provider selection, fallback, cost/latency estimation |
| `agents/` | Agent definitions, orchestration, execution |
| `registry/` | Agent registration, discovery, health monitoring |
| `context/` | Context building, token budgeting, compression |
| `execution/` | Execution queue, pipeline, retry, cancellation |
| `memory/` | 9-tier hierarchical memory with lifecycle |
| `prompts/` | Template registry, versioning, composition, testing |
| `providers/` | OpenAI, Anthropic, Gemini, OpenRouter, Ollama |
| `embeddings/` | Vector generation, storage, similarity search |
| `tools/` | Universal tool registry with 12 categories |
| `planning/` | Goal decomposition, task graphs, progress tracking |
| `reasoning/` | Chain/tree-of-thought, reflection, verification |
| `telemetry/` | Execution logs, cost tracking, performance monitoring |
| `contracts/` | Service, provider, and agent contracts |
| `evaluation/` | Quality scoring, hallucination detection, success tracking |
| `safety/` | Policy enforcement, approval workflow, audit logging |
