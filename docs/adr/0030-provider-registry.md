# ADR-0030: Provider Registry with Action Discovery

## Status
Accepted

## Context
AI Executive and Action Engine need to know what external actions are available. Providers register actions declaratively with parameters, risk levels, and methods.

## Decision
Providers implement `getActions()` returning typed `ProviderAction[]`. Registry aggregates all actions across all providers. AI Executive queries `getAllActions()` to discover capabilities.

## Action Flow
1. Provider registered → actions available in registry
2. AI Executive queries available actions
3. User or AI submits action → routed through Action Engine → delegated to Integration Hub → provider executes
