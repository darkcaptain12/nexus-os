# Graph Report - . (2026-07-07)

## Corpus Check

- 160 files · ~67,240 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1398 nodes · 3471 edges · 63 communities (55 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_C0|C0]]
- [[_COMMUNITY_C1|C1]]
- [[_COMMUNITY_C2|C2]]
- [[_COMMUNITY_C3|C3]]
- [[_COMMUNITY_C4|C4]]
- [[_COMMUNITY_C5|C5]]
- [[_COMMUNITY_C6|C6]]
- [[_COMMUNITY_C7|C7]]
- [[_COMMUNITY_C8|C8]]
- [[_COMMUNITY_C9|C9]]
- [[_COMMUNITY_C10|C10]]
- [[_COMMUNITY_C11|C11]]
- [[_COMMUNITY_C12|C12]]
- [[_COMMUNITY_C13|C13]]
- [[_COMMUNITY_C14|C14]]
- [[_COMMUNITY_C15|C15]]
- [[_COMMUNITY_C16|C16]]
- [[_COMMUNITY_C17|C17]]
- [[_COMMUNITY_C18|C18]]
- [[_COMMUNITY_C19|C19]]
- [[_COMMUNITY_C20|C20]]
- [[_COMMUNITY_C21|C21]]
- [[_COMMUNITY_C22|C22]]
- [[_COMMUNITY_C23|C23]]
- [[_COMMUNITY_C24|C24]]
- [[_COMMUNITY_C25|C25]]
- [[_COMMUNITY_C26|C26]]
- [[_COMMUNITY_C27|C27]]
- [[_COMMUNITY_C28|C28]]
- [[_COMMUNITY_C29|C29]]
- [[_COMMUNITY_C30|C30]]
- [[_COMMUNITY_C31|C31]]
- [[_COMMUNITY_C32|C32]]
- [[_COMMUNITY_C33|C33]]
- [[_COMMUNITY_C34|C34]]
- [[_COMMUNITY_C35|C35]]
- [[_COMMUNITY_C36|C36]]
- [[_COMMUNITY_C37|C37]]
- [[_COMMUNITY_C38|C38]]
- [[_COMMUNITY_C39|C39]]
- [[_COMMUNITY_C40|C40]]
- [[_COMMUNITY_C41|C41]]
- [[_COMMUNITY_C42|C42]]
- [[_COMMUNITY_C43|C43]]
- [[_COMMUNITY_C44|C44]]
- [[_COMMUNITY_C45|C45]]
- [[_COMMUNITY_C46|C46]]
- [[_COMMUNITY_C47|C47]]
- [[_COMMUNITY_C48|C48]]
- [[_COMMUNITY_C49|C49]]
- [[_COMMUNITY_C50|C50]]
- [[_COMMUNITY_C51|C51]]
- [[_COMMUNITY_C52|C52]]
- [[_COMMUNITY_C53|C53]]
- [[_COMMUNITY_C54|C54]]
- [[_COMMUNITY_C55|C55]]
- [[_COMMUNITY_C56|C56]]
- [[_COMMUNITY_C57|C57]]
- [[_COMMUNITY_C58|C58]]
- [[_COMMUNITY_C61|C61]]
- [[_COMMUNITY_C62|C62]]

## God Nodes (most connected - your core abstractions)

1. `getMemoryStore()` - 35 edges
2. `RepositoryResult` - 28 edges
3. `createClient()` - 28 edges
4. `ListResult` - 27 edges
5. `TaskRepository` - 22 edges
6. `getExecutiveDashboard()` - 21 edges
7. `MemoryStore` - 21 edges
8. `createRepositories()` - 20 edges
9. `BaseRepository` - 19 edges
10. `store()` - 19 edges

## Surprising Connections (you probably didn't know these)

- `commerceDiscover()` --calls--> `discoverProducts()` [EXTRACTED]
  apps/web/src/lib/commerce/intelligence/services/commerce-intelligence-service.ts → apps/web/src/lib/commerce/intelligence/discovery-registry.ts
- `getTradingStatusSummary` --references--> `Paper Trading` [INFERRED]
  quant/services/README.md → quant/README.md
- `Pure Parser Functions` --semantically_similar_to--> `Plain JSON Contract` [INFERRED] [semantically similar]
  quant/exchanges/README.md → quant/services/README.md
- `defaultStepExecutor()` --calls--> `getActionEngine()` [INFERRED]
  apps/web/src/lib/agents/agent-runner.ts → apps/web/src/lib/actions/engine-instance.ts
- `buildApprovalCenter()` --calls--> `getActionEngine()` [EXTRACTED]
  apps/web/src/lib/mobile/mobile-runtime.ts → apps/web/src/lib/actions/engine-instance.ts

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **Window Context Fusion (IDE+Browser+Screen)** — desktop_vision_readme_window_context_service, desktop_vision_readme_ide_insight, desktop_vision_readme_browser_insight, desktop_vision_readme_screen_capture_service [EXTRACTED 1.00]
- **File Insight Pipeline (entity-extractor to KG to Memory to Executive)** — desktop_vision_readme_file_insight_service, desktop_vision_readme_entity_extractor, desktop_vision_readme_knowledge_graph, desktop_vision_readme_memory_engine [EXTRACTED 1.00]
- **Desktop Context Delivery to Executive** — desktop_vision_readme_desktop_vision_service, desktop_vision_readme_context_builder_v3, desktop_vision_readme_orchestrator_context [EXTRACTED 1.00]
- **Knowledge Graph v2 Module Composition** — knowledge_readme_types, knowledge_readme_graph_store, knowledge_readme_relationship_engine, knowledge_readme_auto_linker, knowledge_readme_semantic_search, knowledge_readme_context_selector [EXTRACTED 1.00]
- **Auto-Linker Feeding Hooks** — knowledge_readme_agent_runtime, knowledge_readme_agent_runner, knowledge_readme_trading_actions, knowledge_readme_desktop_sync, knowledge_readme_auto_linker [EXTRACTED 1.00]
- **Paper Trading Safety Flow** — quant_readme_trading_actions, quant_readme_paper_trading, quant_readme_approval_queue, quant_readme_paper_only_safety_rule [EXTRACTED 1.00]
- **Market Analysis Pipeline** — quant_readme_market_data, quant_readme_indicators, quant_readme_smart_money_concepts, quant_readme_analysis_engine, quant_readme_strategy_engine [INFERRED 0.85]
- **Voice Intent Pipeline** — services_readme_parsevoiceintent, services_readme_handlevoiceintent, quant_readme_agent_runtime, services_readme_quant_service [EXTRACTED 1.00]

## Communities (63 total, 8 thin omitted)

### Community 0 - "C0"

Cohesion: 0.06
Nodes (87): voiceCurrentConversation(), voiceHistory(), voiceInterrupt(), voiceProcess(), voiceProcessAudio(), voiceProviders(), voiceSettings(), voiceStart() (+79 more)

### Community 1 - "C1"

Cohesion: 0.06
Nodes (77): getMobileSystemHealth(), runBackgroundSync(), g, getDevice(), getDevices(), getPushTokens(), getWatchDevices(), heartbeat() (+69 more)

### Community 2 - "C2"

Cohesion: 0.06
Nodes (39): advanceStep(), defaultSteps(), getCurrentStep(), isLastStep(), planAgent(), PlannerRule, RULES, StepTemplate (+31 more)

### Community 3 - "C3"

Cohesion: 0.05
Nodes (50): ACTION_DEFS, g, getActionEngine(), memorySaveHandler, notificationSendHandler, projectArchiveHandler, taskCompleteHandler, taskCreateHandler (+42 more)

### Community 4 - "C4"

Cohesion: 0.08
Nodes (38): ENTITY_TYPE_MAP, EXCHANGE_NAMES, ingestText(), recordAdCampaign(), recordAgentCreated(), recordAgentStep(), recordClipboard(), recordDesktopActivity() (+30 more)

### Community 5 - "C5"

Cohesion: 0.10
Nodes (29): formatDateTR(), generateDailyJournal(), generateDaySummary(), TIME_SECTIONS, addProjectDecision(), addProjectNote(), extractRelatedIds(), getProjectMemory() (+21 more)

### Community 6 - "C6"

Cohesion: 0.09
Nodes (33): analyzeBrowser(), BROWSER_MAP, classifyWorkContext(), CONTEXT_DOMAINS, detectBrowserKind(), DOMAIN_SEPARATORS, extractDomain(), CODE_SIGNALS (+25 more)

### Community 7 - "C7"

Cohesion: 0.10
Nodes (25): binanceAdapter, BinanceKline, BinanceTicker24h, INTERVAL_MAP, parseBinanceKlines(), parseBinanceTicker(), bybitAdapter, BybitKlineResponse (+17 more)

### Community 8 - "C8"

Cohesion: 0.12
Nodes (33): Binance Adapter, Bybit Adapter, Exchange Registry, ExchangeAdapter, MEXC Adapter, Pure Parser Functions, Action Engine, Agent Runtime (+25 more)

### Community 9 - "C9"

Cohesion: 0.08
Nodes (3): MemoryRepository, TaskRepository, ListResult

### Community 10 - "C10"

Cohesion: 0.21
Nodes (28): askExecutive(), generateDailyBriefing(), getAIContextData(), getAIExecutiveStatus(), getDailyPlanData(), getDecisions(), getEnergyPlan(), getExecutiveDashboard() (+20 more)

### Community 11 - "C11"

Cohesion: 0.13
Nodes (24): CONFIDENCE_BY_EVIDENCE_COUNT(), DecisionEngineInput, impactFromScore(), productivityDecision(), recommendationToDecision(), riskLevelFromScore(), riskToDecision(), runDecisionEngine() (+16 more)

### Community 12 - "C12"

Cohesion: 0.16
Nodes (18): Repositories, MemoryEntityRecord, MemoryGraphEdge, MemoryGraphNode, MemoryHealthReport, MemoryLinkRecord, ProjectActivityRecord, ProjectFilters (+10 more)

### Community 13 - "C13"

Cohesion: 0.15
Nodes (24): classifyClipboard(), detectCodeLanguage(), g, getClipboardHistory(), getClipboardStats(), hashContent(), ingestClipboard(), store() (+16 more)

### Community 14 - "C14"

Cohesion: 0.13
Nodes (21): g, PlaceOrderInput, checkOrderRisk(), DEFAULT_RISK_PROFILE, AlertStatus, BacktestResult, BacktestTrade, BollingerResult (+13 more)

### Community 15 - "C15"

Cohesion: 0.17
Nodes (22): withCache(), getAlertEngine(), runBacktest(), CANDLE_TTL_MS, getCandles(), getTicker(), getPaperTradingEngine(), closePosition() (+14 more)

### Community 16 - "C16"

Cohesion: 0.23
Nodes (19): buildAIContext(), OpportunityEngineInput, calculateProductivity(), analyzeRisks(), ScenarioContext, GoalRecord, ModuleStatus, NotificationSummary (+11 more)

### Community 17 - "C17"

Cohesion: 0.17
Nodes (19): analyzeMarket(), findSupportResistance(), atr(), bollinger(), ema(), lastDefined(), macd(), rsi() (+11 more)

### Community 18 - "C18"

Cohesion: 0.18
Nodes (14): getDecisionHistory(), getDecisionHistoryData(), recordDecisionOutcome(), CycleLearning, ExecutiveTimelineEntry, PipelineOutput, LoopRunResult, runExecutiveCycle() (+6 more)

### Community 19 - "C19"

Cohesion: 0.16
Nodes (7): ExecutiveCycle, ExecutiveState, PipelineStage, StateTransition, CycleEngine, ExecutiveStateMachine, VALID_TRANSITIONS

### Community 20 - "C20"

Cohesion: 0.10
Nodes (22): auto-linker, browser-insight.ts, clipboard-service.ts, content-classifier.ts, Context Builder v3, Desktop Intelligence v1.0, desktop-vision-service.ts, entity-extractor (+14 more)

### Community 21 - "C21"

Cohesion: 0.23
Nodes (20): archiveProject(), createProject(), deleteProject(), getAuthContext(), restoreProject(), revalidateProjectPaths(), updateProject(), updateProjectStatus() (+12 more)

### Community 22 - "C22"

Cohesion: 0.16
Nodes (18): classifyContent(), getRecentOcrResults(), analyzeUi(), UiAnalysis, UiElement, getWindowContext(), VoiceIntent, VoiceIntentName (+10 more)

### Community 23 - "C23"

Cohesion: 0.19
Nodes (19): g, getAvgAdIntensity(), getCompetitorCount(), getCompetitorHistory(), key(), recordCompetitorSnapshot(), store(), discoverProducts() (+11 more)

### Community 24 - "C24"

Cohesion: 0.14
Nodes (13): ClassifiedError, classify(), classifyError(), log, RETRYABLE_BY_CLASSIFICATION, SEVERITY_BY_CLASSIFICATION, STATUS_BY_CLASSIFICATION, USER_MESSAGES (+5 more)

### Community 25 - "C25"

Cohesion: 0.17
Nodes (19): AuditStatus, checkAuthMiddleware(), checkCookieSettings(), checkCors(), checkCsp(), checkJwtConfig(), checkPublicEnvVarsForSecretPatterns(), checkRateLimiting() (+11 more)

### Community 26 - "C26"

Cohesion: 0.13
Nodes (13): ENERGY_BLOCKS, EnergyBlock, PRIORITY_ENERGY, PRIORITY_WEIGHT, AIExecutiveStatus, DailyBriefing, DailyPlan, ExecutiveDashboardData (+5 more)

### Community 27 - "C27"

Cohesion: 0.14
Nodes (14): FactorConfig, FACTORS, ScoringContext, FAST_COUNTRIES, HIGH_RISK_COUNTRIES, AdRecommendationAction, CommerceIntelligenceDashboard, CommerceScore (+6 more)

### Community 28 - "C28"

Cohesion: 0.17
Nodes (17): getCommerceOverview(), g, getActiveCampaignCount(), getAverageRoas(), getRecentAdMetrics(), recommendAdAction(), recordAdMetrics(), store() (+9 more)

### Community 29 - "C29"

Cohesion: 0.14
Nodes (12): ADAPTERS, AIProviderAdapter, AIProviderConfig, AIProviderName, AnthropicAdapter, ChatMessage, ChatResponse, GeminiAdapter (+4 more)

### Community 30 - "C30"

Cohesion: 0.24
Nodes (16): getCache(), getErrorRegistry(), AuditCriteria, AuditSection, buildCodeHealthSection(), buildPerformanceSection(), buildReliabilitySection(), buildSecuritySection() (+8 more)

### Community 31 - "C31"

Cohesion: 0.21
Nodes (13): buildCampaignPlan(), CampaignInput, PLATFORM_DEFAULTS, buildCreativeBrief(), priceHook(), getInventoryReport(), AdCampaignPlan, AdPlatform (+5 more)

### Community 32 - "C32"

Cohesion: 0.16
Nodes (16): csvProvider, g, g2, getDiscoveryProvider(), listDiscoveryProviders(), loadCsvSource(), makeStubProvider(), parseCsvProducts() (+8 more)

### Community 33 - "C33"

Cohesion: 0.15
Nodes (17): Adjacency List, agents/agent-runner.ts, agents/agent-runtime.ts, auto-linker.ts, Context Builder v2, ai/orchestrator/context-pipeline.ts, context-selector.ts, api/desktop/sync (+9 more)

### Community 34 - "C34"

Cohesion: 0.18
Nodes (3): BaseRepository, ConversationRepository, GoalRepository

### Community 35 - "C35"

Cohesion: 0.26
Nodes (13): getRepos(), getGoalPriority(), getUser(), resetPassword(), signIn(), signOut(), signUp(), updateUserName() (+5 more)

### Community 36 - "C36"

Cohesion: 0.24
Nodes (15): drainOcrQueue(), enqueueOcr(), g, getActiveOcrProvider(), getOcrStats(), hashText(), listOcrProviders(), OcrEngineState (+7 more)

### Community 37 - "C37"

Cohesion: 0.18
Nodes (6): DesktopActivityRecord, instrumentQuery(), NPlusOneSuspect, QueryAuditor, QueryLogEntry, RepositoryHeatmapEntry

### Community 38 - "C38"

Cohesion: 0.24
Nodes (12): detectLanguage(), fileTypeFromName(), analyzeFile(), g, getFileInsightCount(), getRecentFileInsights(), store(), summarize() (+4 more)

### Community 39 - "C39"

Cohesion: 0.24
Nodes (10): generateHealthReport(), getCpuUsage(), STATUS_WEIGHTS, SystemHealthReport, getMetrics(), getModuleHealthTracker(), ModuleHealthTracker, ModuleState (+2 more)

### Community 41 - "C41"

Cohesion: 0.25
Nodes (8): AlertEngine, CreateAlertInput, g, BacktestInput, AlertCondition, Candle, QuantAlert, Timeframe

### Community 42 - "C42"

Cohesion: 0.23
Nodes (13): analyzeSmc(), computePremiumDiscount(), detectBreakerBlocks(), detectFairValueGaps(), detectLiquiditySweeps(), detectMitigationBlocks(), detectOrderBlocks(), detectStructure() (+5 more)

### Community 44 - "C44"

Cohesion: 0.15
Nodes (6): KNOWN_WORKERS, WorkerHealth, WorkerHealthRegistry, WorkerRunReport, WorkerRunStatus, WorkerState

### Community 45 - "C45"

Cohesion: 0.33
Nodes (4): PaperTradingEngine, PaperOrder, PaperPosition, RiskProfile

### Community 46 - "C46"

Cohesion: 0.27
Nodes (10): adLaunchHandler, budgetIncreaseHandler, enqueueProduct(), g, getQueue(), getQueuedProduct(), getQueueMetrics(), store() (+2 more)

### Community 47 - "C47"

Cohesion: 0.24
Nodes (3): DecisionRepository, JournalRepository, NoteRecord

### Community 48 - "C48"

Cohesion: 0.22
Nodes (3): CacheEntry, CacheStats, TTLCache

### Community 50 - "C50"

Cohesion: 0.36
Nodes (3): DecisionHistoryStore, DecisionHistoryEntry, ExecutiveLearningReport

### Community 51 - "C51"

Cohesion: 0.36
Nodes (8): simulateChangePlan(), simulateDelegate(), simulateGeneric(), simulateProjectFirst(), simulateScenario(), simulateTaskPostponed(), ScenarioInput, ScenarioResult

### Community 52 - "C52"

Cohesion: 0.28
Nodes (7): checkApiRateLimit(), DEFAULT_API_GROUP, InMemoryRateLimiter, RATE_LIMIT_GROUPS, RateLimitGroupConfig, RateLimitResult, resolveRateLimitGroup()

### Community 53 - "C53"

Cohesion: 0.25
Nodes (7): CommerceAlert, CommerceOrderSummary, CommerceOverview, CommerceProductSummary, EMPTY, OrderRow, ProductRow

### Community 54 - "C54"

Cohesion: 0.48
Nodes (6): AIContext, buildExecutivePrompt(), buildMorningBriefPrompt(), buildPlanningPrompt(), buildRiskAnalysisPrompt(), buildWeeklyReviewPrompt()

### Community 55 - "C55"

Cohesion: 0.29
Nodes (6): MetricEntry, ObservabilityModule, PercentileStats, ProcessMetrics, RequestTrace, SlowEntry

## Knowledge Gaps

- **177 isolated node(s):** `g`, `ACTION_DEFS`, `AutomationMetrics`, `StepTemplate`, `PlannerRule` (+172 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `getMemoryStore()` connect `C5` to `C0`, `C2`, `C4`, `C38`, `C6`, `C13`, `C46`, `C15`, `C14`, `C22`, `C23`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `getKernel()` connect `C3` to `C16`, `C10`, `C39`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `TaskRepository` connect `C9` to `C34`, `C43`, `C12`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `g`, `ACTION_DEFS`, `AutomationMetrics` to the rest of the system?**
  _180 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `C0` be split into smaller, more focused modules?**
  _Cohesion score 0.058333333333333334 - nodes in this community are weakly interconnected._
- **Should `C1` be split into smaller, more focused modules?**
  _Cohesion score 0.05942571785268414 - nodes in this community are weakly interconnected._
- **Should `C2` be split into smaller, more focused modules?**
  _Cohesion score 0.06202435312024353 - nodes in this community are weakly interconnected._
