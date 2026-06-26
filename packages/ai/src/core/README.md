# AI Core

Foundation types and interfaces for the entire AI subsystem. Every other AI module depends on core.

## Exports

- **Types**: `AIMessage`, `AIResponse`, `AIModel`, `TokenUsage`, `ChatOptions`
- **Provider**: `AIProvider`, `AIProviderConfig`, `ProviderHealth`
- **System**: `AISystem` — top-level interface connecting all subsystems
- **Routing**: `AIRouter`, `RoutingRequirements`
- **Agents**: `AgentOrchestrator`, `AgentInput`, `AgentResult`
- **Memory**: `MemoryEngine`, `MemoryMetadata`, `MemoryResult`
- **Context**: `ContextEngine`, `ContextBuildRequest`, `ContextOutput`
- **Tools**: `ToolRegistry`, `RegisteredTool`
- **Telemetry**: `TelemetryCollector`, `ExecutionRecord`, `AIMetrics`
- **Safety**: `SafetyGuard`, `SafetyCheckRequest`, `SafetyCheckResult`
