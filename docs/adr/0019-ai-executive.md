# ADR-0019: AI Executive with Deterministic Rule Engine

## Status

Accepted

## Context

NEXUS OS needs an operating intelligence — not a chatbot, but a system that reads user state, generates briefings, and produces ranked recommendations. This must work without an LLM API key configured.

## Decision

Implement a two-tier AI Executive: a deterministic rule engine as the primary (fallback) mode, with a provider-agnostic AI layer that can be enabled when API keys are configured. The rule engine generates all outputs from database state using scoring rules.

## Why

- **Works offline**: No API key needed — rule engine produces meaningful output from pure database state.
- **Provider-agnostic**: When AI is configured, the executive delegates to whichever provider the router selects. No vendor lock-in.
- **Testable**: Rule engine is deterministic — same inputs always produce same outputs. 100% testable without mocking LLM responses.
- **Fast**: Rule engine executes in <1ms. No network latency.
- **Auditable**: Every recommendation includes a `reasoning` field explaining why it was generated.
- **Scored**: Recommendations are ranked by a numeric score, not just priority. Score combines urgency, importance, and recency.

## Rule Engine Categories

- **Task rules**: Overdue detection, due-today alerts, high-priority flagging
- **Goal rules**: Low progress warnings, no-goals nudge
- **Calendar rules**: Upcoming event awareness
- **System rules**: Health degradation, failed services, unconfigured modules
- **Reminder rules**: Overdue reminder alerts

## Consequences

- Rule engine requires explicit rules for each recommendation type — not open-ended like LLM.
- Adding new recommendation types requires writing new rules.
- AI provider integration will enhance quality but rule engine remains as fallback.
