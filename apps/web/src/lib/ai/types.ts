export interface UserState {
  userId: string;
  name: string;
  email: string;
  timezone: string;
  locale: string;
}

export interface SystemState {
  kernelPhase: string;
  healthScore: number;
  servicesTotal: number;
  servicesRunning: number;
  servicesFailed: number;
  eventsPublished: number;
  commandsDispatched: number;
  uptime: number;
  aiProviderConfigured: boolean;
  memoryEngineActive: boolean;
  agentSystemActive: boolean;
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  highPriority: number;
}

export interface GoalSummary {
  total: number;
  active: number;
  completed: number;
  averageProgress: number;
}

export interface CalendarSummary {
  eventsToday: number;
  eventsThisWeek: number;
  nextEvent?: { title: string; startAt: string };
}

export interface ReminderSummary {
  upcoming: number;
  overdueCount: number;
  nextReminder?: { title: string; remindAt: string };
}

export interface NotificationSummary {
  unread: number;
  total: number;
}

export interface ModuleStatus {
  name: string;
  enabled: boolean;
  status: 'active' | 'configured' | 'unconfigured' | 'disabled';
}

export interface DailyBriefing {
  greeting: string;
  date: string;
  summary: string[];
  taskSummary: TaskSummary;
  goalSummary: GoalSummary;
  calendarSummary: CalendarSummary;
  reminderSummary: ReminderSummary;
  systemHealth: SystemState;
  modules: ModuleStatus[];
  generatedAt: string;
  generatedBy: 'rule-engine' | 'ai-provider';
  durationMs: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'task' | 'goal' | 'health' | 'productivity' | 'system' | 'learning';
  priority: number;
  score: number;
  actionUrl?: string;
  reasoning: string;
}

export interface AIExecutiveStatus {
  mode: 'rule-engine' | 'ai-provider';
  provider?: string;
  model?: string;
  kernelPhase: string;
  healthScore: number;
  memoryActive: boolean;
  agentsActive: boolean;
  lastExecutionAt?: string;
  lastExecutionDurationMs?: number;
  totalExecutions: number;
  fallbackMode: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Risk {
  id: string;
  title: string;
  description: string;
  level: RiskLevel;
  category: 'deadline' | 'stale' | 'overload' | 'priority' | 'subtask' | 'project';
  score: number;
  reasoning: string;
  actionUrl?: string;
}

export interface DailyPlan {
  date: string;
  slots: PlanSlot[];
  totalEstimatedMinutes: number;
  generatedAt: string;
}

export interface PlanSlot {
  startHour: number;
  endHour: number;
  taskId?: string;
  taskTitle: string;
  priority: string;
  reasoning: string;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  completedTasks: number;
  overdueTasks: number;
  projectProgress: { name: string; percent: number }[];
  productivityScore: number;
  nextWeekFocus: string[];
  generatedAt: string;
}

export interface ProductivityScore {
  score: number;
  breakdown: { factor: string; weight: number; value: number; contribution: number }[];
  trend: 'improving' | 'stable' | 'declining';
  generatedAt: string;
}

export interface ApprovalItem {
  id: string;
  type: 'status_change' | 'priority_change' | 'archive' | 'reminder' | 'complete';
  title: string;
  description: string;
  reasoning: string;
  targetId: string;
  targetType: 'task' | 'project';
  action: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface AIContext {
  tasks: {
    recent: {
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate: string | null;
    }[];
  };
  projects: { active: { id: string; name: string; status: string; progress: number }[] };
  risks: Risk[];
  productivityScore: number;
  generatedAt: string;
}

// ─── Sprint 11: Strategic Decision Engine ────────────────────────────────────

export interface DecisionAlternative {
  option: string;
  score: number;
  tradeoff: string;
}

export interface ExplainableDecision {
  id: string;
  decision: string;
  reasoning: string;
  confidence: number;
  evidence: string[];
  alternatives: DecisionAlternative[];
  tradeoffs: string[];
  risk: RiskLevel;
  impact: 'low' | 'medium' | 'high' | 'critical';
  estimatedBenefit: string;
  estimatedCost: string;
  category: 'task' | 'project' | 'goal' | 'system' | 'productivity' | 'opportunity';
  requiresApproval: boolean;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  opportunityScore: number;
  category: 'completion' | 'automation' | 'delegation' | 'acceleration' | 'quick_win' | 'time';
  reasoning: string;
  actionUrl?: string;
  estimatedBenefit: string;
}

export interface GoalRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  progress: number;
  owner_id: string;
  priority: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PrioritizedGoal {
  goalId: string;
  title: string;
  priorityScore: number;
  scoreBreakdown: { factor: string; weight: number; value: number; contribution: number }[];
  deadlinePressure: number;
  importance: number;
  workloadScore: number;
  riskScore: number;
  actionRecommendation: string;
  targetDate: string | null;
  progress: number;
}

export interface ScenarioInput {
  type: 'task_postponed' | 'project_first' | 'delegate' | 'change_plan';
  subjectId?: string;
  subjectTitle?: string;
  description: string;
}

export interface ScenarioResult {
  scenario: string;
  risk: number;
  benefit: number;
  confidence: number;
  explanation: string;
  keyFactors: string[];
  recommendedAction: string;
  simulatedAt: string;
}

export interface DecisionHistoryEntry {
  id: string;
  decision: string;
  category: string;
  confidence: number;
  outcome: 'accepted' | 'rejected' | 'pending' | 'expired';
  actualResult?: 'successful' | 'failed' | 'unknown';
  createdAt: string;
  resolvedAt?: string;
  reasoning: string;
}

export interface ExecutiveLearningReport {
  weekStart: string;
  weekEnd: string;
  totalDecisions: number;
  accepted: number;
  rejected: number;
  expired: number;
  acceptanceRate: number;
  successfulOutcomes: number;
  confidenceAccuracy: number;
  topCategories: { category: string; count: number; acceptanceRate: number }[];
  insight: string;
  generatedAt: string;
}

export interface ExecutiveDashboardData {
  executiveScore: number;
  riskScore: number;
  productivityScore: number;
  productivityTrend: 'improving' | 'declining' | 'stable';
  topRisks: Risk[];
  topOpportunities: Opportunity[];
  decisions: ExplainableDecision[];
  pendingApprovals: ApprovalItem[];
  goalPriority: PrioritizedGoal[];
  focusRecommendation: string;
  briefingSummary: string[];
  confidence: number;
  generatedAt: string;
}

// ─── Sprint 12: AI Orchestration Layer ───────────────────────────────────────

export type ExecutiveState =
  | 'IDLE'
  | 'COLLECTING_CONTEXT'
  | 'ANALYZING'
  | 'GENERATING_OPTIONS'
  | 'WAITING_APPROVAL'
  | 'EXECUTING'
  | 'LEARNING'
  | 'FAILED';

export interface StateTransition {
  from: ExecutiveState;
  to: ExecutiveState;
  at: string;
  reason?: string;
}

export interface PipelineStage {
  name: string;
  startAt: string;
  endAt?: string;
  durationMs?: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  outputSummary?: string;
}

export interface ExecutiveCycle {
  id: string;
  startAt: string;
  finishAt?: string;
  durationMs?: number;
  state: ExecutiveState;
  decisionCount: number;
  approvalCount: number;
  executionCount: number;
  failureCount: number;
  confidenceAverage: number;
  contextBuildMs: number;
  pipelineMs: number;
  stages: PipelineStage[];
  insight?: string;
}

export interface PipelineOutput {
  decisions: ExplainableDecision[];
  opportunities: Opportunity[];
  goalPriority: PrioritizedGoal[];
  recommendations: Recommendation[];
  energyPlan: DailyPlan;
  riskScore: number;
  pendingApprovals: ApprovalItem[];
  pipelineDurationMs: number;
  stages: PipelineStage[];
}

export interface ExecutiveTimelineEntry {
  cycleId: string;
  contextSummary: {
    taskCount: number;
    projectCount: number;
    goalCount: number;
    riskScore: number;
    productivityScore: number;
    desktopActive: boolean;
  };
  decisions: Pick<ExplainableDecision, 'id' | 'decision' | 'confidence' | 'requiresApproval'>[];
  approvals: Pick<ApprovalItem, 'id' | 'title' | 'status'>[];
  executions: string[];
  learningInsight?: string;
  stages: PipelineStage[];
  startAt: string;
  endAt?: string;
  durationMs?: number;
}

export interface CycleLearning {
  cycleId: string;
  decisionsAdded: number;
  acceptanceRateTrend: 'improving' | 'declining' | 'stable';
  topInsight: string;
  generatedAt: string;
}
