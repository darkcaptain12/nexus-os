# Graph Report - . (2026-07-02)

## Corpus Check

- Corpus is ~11,167 words - fits in a single context window. You may not need a graph.

## Summary

- 195 nodes · 534 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_AI Executive Core|AI Executive Core]]
- [[_COMMUNITY_Opportunity & Rule Engines|Opportunity & Rule Engines]]
- [[_COMMUNITY_Decision History & Learning|Decision History & Learning]]
- [[_COMMUNITY_Orchestrator State Machine|Orchestrator State Machine]]
- [[_COMMUNITY_AI Provider Adapters|AI Provider Adapters]]
- [[_COMMUNITY_Approval & Energy Pipeline|Approval & Energy Pipeline]]
- [[_COMMUNITY_Context Builder & Risk|Context Builder & Risk]]
- [[_COMMUNITY_Decision Engine Logic|Decision Engine Logic]]
- [[_COMMUNITY_Approval Queue|Approval Queue]]
- [[_COMMUNITY_Decision History Store|Decision History Store]]
- [[_COMMUNITY_Scenario Engine|Scenario Engine]]
- [[_COMMUNITY_Goal Prioritizer|Goal Prioritizer]]

## God Nodes (most connected - your core abstractions)

1. `getExecutiveDashboard()` - 15 edges
2. `TaskSummary` - 14 edges
3. `getTaskSummary()` - 11 edges
4. `getTasksAndProjects()` - 10 edges
5. `OrchestratorContext` - 10 edges
6. `runDecisionPipeline()` - 10 edges
7. `ExecutiveCycle` - 10 edges
8. `ExecutiveTimelineEntry` - 10 edges
9. `runDecisionEngine()` - 9 edges
10. `recordExecution()` - 9 edges

## Surprising Connections (you probably didn't know these)

- `getExecutiveSummary()` --calls--> `getApprovalQueue()` [EXTRACTED]
  src/lib/ai/executive.ts → src/lib/ai/approval-queue.ts
- `getAIContextData()` --calls--> `buildAIContext()` [EXTRACTED]
  src/lib/ai/executive.ts → src/lib/ai/context-builder.ts
- `DecisionEngineInput` --references--> `TaskSummary` [EXTRACTED]
  src/lib/ai/decision-engine.ts → src/lib/ai/types.ts
- `getDecisions()` --calls--> `runDecisionEngine()` [EXTRACTED]
  src/lib/ai/executive.ts → src/lib/ai/decision-engine.ts
- `getDecisionHistoryData()` --calls--> `getDecisionHistory()` [EXTRACTED]
  src/lib/ai/executive.ts → src/lib/ai/decision-history.ts

## Import Cycles

- None detected.

## Communities (12 total, 1 thin omitted)

### Community 0 - "AI Executive Core"

Cohesion: 0.21
Nodes (26): askExecutive(), generateDailyBriefing(), getAIContextData(), getAIExecutiveStatus(), getDailyPlanData(), getDecisions(), getEnergyPlan(), getExecutiveSummary() (+18 more)

### Community 1 - "Opportunity & Rule Engines"

Cohesion: 0.13
Nodes (19): nextId(), OpportunityEngineInput, ScenarioContext, AIContext, AIExecutiveStatus, CalendarSummary, DailyBriefing, DailyPlan (+11 more)

### Community 2 - "Decision History & Learning"

Cohesion: 0.17
Nodes (15): getDecisionHistory(), getDecisionHistoryData(), recordDecisionOutcome(), CycleLearning, ExecutiveTimelineEntry, ExplainableDecision, PipelineOutput, LoopRunResult (+7 more)

### Community 3 - "Orchestrator State Machine"

Cohesion: 0.16
Nodes (7): ExecutiveCycle, ExecutiveState, PipelineStage, StateTransition, CycleEngine, ExecutiveStateMachine, VALID_TRANSITIONS

### Community 4 - "AI Provider Adapters"

Cohesion: 0.15
Nodes (13): ADAPTERS, AIProviderAdapter, AIProviderConfig, AIProviderName, AnthropicAdapter, ChatMessage, ChatResponse, chatWithProvider() (+5 more)

### Community 5 - "Approval & Energy Pipeline"

Cohesion: 0.22
Nodes (15): getApprovalQueue(), runDecisionEngine(), blockReasoning(), ENERGY_BLOCKS, EnergyBlock, generateEnergyPlan(), PRIORITY_ENERGY, scoredTasksForBlock() (+7 more)

### Community 6 - "Context Builder & Risk"

Cohesion: 0.30
Nodes (11): buildAIContext(), calculateProductivity(), analyzeRisks(), calculateOverallRiskScore(), ModuleStatus, NotificationSummary, ProductivityScore, SystemState (+3 more)

### Community 7 - "Decision Engine Logic"

Cohesion: 0.28
Nodes (12): CONFIDENCE_BY_EVIDENCE_COUNT(), DecisionEngineInput, impactFromScore(), productivityDecision(), recommendationToDecision(), riskLevelFromScore(), riskToDecision(), DecisionAlternative (+4 more)

### Community 9 - "Decision History Store"

Cohesion: 0.36
Nodes (3): DecisionHistoryStore, DecisionHistoryEntry, ExecutiveLearningReport

### Community 10 - "Scenario Engine"

Cohesion: 0.36
Nodes (8): simulateChangePlan(), simulateDelegate(), simulateGeneric(), simulateProjectFirst(), simulateScenario(), simulateTaskPostponed(), ScenarioInput, ScenarioResult

### Community 11 - "Goal Prioritizer"

Cohesion: 0.29
Nodes (3): PRIORITY_WEIGHT, GoalRecord, PrioritizedGoal

## Knowledge Gaps

- **10 isolated node(s):** `EnergyBlock`, `ENERGY_BLOCKS`, `PRIORITY_ENERGY`, `PRIORITY_WEIGHT`, `VALID_TRANSITIONS` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `ApprovalItem` connect `Approval Queue` to `AI Executive Core`, `Opportunity & Rule Engines`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `ExecutiveCycle` connect `Orchestrator State Machine` to `Opportunity & Rule Engines`, `Decision History & Learning`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ExecutiveTimelineEntry` connect `Decision History & Learning` to `Opportunity & Rule Engines`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `EnergyBlock`, `ENERGY_BLOCKS`, `PRIORITY_ENERGY` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Opportunity & Rule Engines` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Should `AI Provider Adapters` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._
