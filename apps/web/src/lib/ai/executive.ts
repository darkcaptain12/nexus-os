import type {
  UserState,
  SystemState,
  TaskSummary,
  GoalSummary,
  CalendarSummary,
  ReminderSummary,
  NotificationSummary,
  ModuleStatus,
  DailyBriefing,
  Recommendation,
  AIExecutiveStatus,
  Risk,
  DailyPlan,
  WeeklyReview,
  ProductivityScore,
  AIContext,
  ApprovalItem,
  ExplainableDecision,
  Opportunity,
  PrioritizedGoal,
  ScenarioInput,
  ScenarioResult,
  ExecutiveDashboardData,
  GoalRecord,
} from './types';
import { generateRecommendations, generateBriefingSummary } from './rule-engine';
import { analyzeRisks, calculateOverallRiskScore } from './risk-engine';
import { calculateProductivity } from './productivity';
import { generateDailyPlan, generateWeeklyReview } from './planner';
import { generateEnergyPlan } from './energy-planner';
import { buildAIContext } from './context-builder';
import { getApprovalQueue } from './approval-queue';
import { runDecisionEngine } from './decision-engine';
import { findOpportunities } from './opportunity-engine';
import { prioritizeGoals } from './goal-prioritizer';
import { simulateScenario } from './scenario-engine';
import { getDecisionHistory } from './decision-history';
import { getKernel } from '@/lib/kernel';
import { createRepositories } from '@/lib/repositories';
import { createClient } from '@/lib/supabase/server';
import { chatWithProvider, getConfiguredProvider } from './providers';
import { buildExecutivePrompt } from './prompts/executive';

let lastExecutionAt: string | undefined;
let lastExecutionDurationMs: number | undefined;
let totalExecutions = 0;

function getModules(): ModuleStatus[] {
  return [
    { name: 'Kernel', enabled: true, status: 'active' },
    { name: 'Event Bus', enabled: true, status: 'active' },
    { name: 'Görevler', enabled: true, status: 'active' },
    { name: 'Projeler', enabled: true, status: 'active' },
    { name: 'Bellek', enabled: true, status: 'active' },
    {
      name: 'Yapay Zeka',
      enabled: !!getConfiguredProvider(),
      status: getConfiguredProvider() ? 'active' : 'unconfigured',
    },
    { name: 'Trading', enabled: false, status: 'disabled' },
    { name: 'E-Ticaret', enabled: false, status: 'disabled' },
    { name: 'Otomasyon', enabled: false, status: 'unconfigured' },
    { name: 'Bildirimler', enabled: true, status: 'active' },
  ];
}

async function getSystemState(): Promise<SystemState> {
  const { kernel, ready } = getKernel();
  await ready;
  const status = kernel.getStatus();
  return {
    kernelPhase: status.phase,
    healthScore: status.health,
    servicesTotal: status.services.total,
    servicesRunning: status.services.running,
    servicesFailed: status.services.failed,
    eventsPublished: status.events.published,
    commandsDispatched: status.commands.dispatched,
    uptime: status.uptime,
    aiProviderConfigured: !!getConfiguredProvider(),
    memoryEngineActive: true,
    agentSystemActive: false,
  };
}

async function getTaskSummary(): Promise<TaskSummary> {
  try {
    const supabase = await createClient();
    const repos = createRepositories(supabase);
    return await repos.tasks.getSummary();
  } catch {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      highPriority: 0,
    };
  }
}

async function getGoalSummary(): Promise<GoalSummary> {
  try {
    const supabase = await createClient();
    const repos = createRepositories(supabase);
    return await repos.goals.getSummary();
  } catch {
    return { total: 0, active: 0, completed: 0, averageProgress: 0 };
  }
}

async function getNotificationSummary(): Promise<NotificationSummary> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
      .is('deleted_at', null);
    return { unread: count ?? 0, total: 0 };
  } catch {
    return { unread: 0, total: 0 };
  }
}

async function getTasksAndProjects() {
  try {
    const supabase = await createClient();
    const repos = createRepositories(supabase);
    const { data: tasks } = await repos.tasks.findFiltered(
      { parentId: null },
      { page: 1, pageSize: 100 },
    );
    const { data: projectList } = await repos.projects.findFiltered(
      { preset: 'active' },
      { page: 1, pageSize: 50 },
    );

    const projects = [];
    for (const proj of projectList) {
      const progress = await repos.projects.getProgress(proj.id);
      projects.push({ project: proj, progress });
    }

    return { tasks, projects };
  } catch {
    return { tasks: [], projects: [] };
  }
}

function recordExecution(durationMs: number) {
  totalExecutions++;
  lastExecutionAt = new Date().toISOString();
  lastExecutionDurationMs = durationMs;
}

export async function generateDailyBriefing(user: UserState): Promise<DailyBriefing> {
  const start = performance.now();
  const [system, tasks, goals, notifications] = await Promise.all([
    getSystemState(),
    getTaskSummary(),
    getGoalSummary(),
    getNotificationSummary(),
  ]);
  const calendar: CalendarSummary = { eventsToday: 0, eventsThisWeek: 0 };
  const reminders: ReminderSummary = { upcoming: 0, overdueCount: 0 };
  const modules = getModules();

  const summary = generateBriefingSummary({
    userName: user.name,
    tasks,
    goals,
    calendar,
    reminders,
    system,
    notifications,
  });
  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  const durationMs = Math.round(performance.now() - start);
  recordExecution(durationMs);

  return {
    greeting: `${greeting}, ${user.name}`,
    date: new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    summary,
    taskSummary: tasks,
    goalSummary: goals,
    calendarSummary: calendar,
    reminderSummary: reminders,
    systemHealth: system,
    modules,
    generatedAt: new Date().toISOString(),
    generatedBy: 'rule-engine',
    durationMs,
  };
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const start = performance.now();
  const [system, tasks, goals] = await Promise.all([
    getSystemState(),
    getTaskSummary(),
    getGoalSummary(),
  ]);
  const calendar: CalendarSummary = { eventsToday: 0, eventsThisWeek: 0 };
  const reminders: ReminderSummary = { upcoming: 0, overdueCount: 0 };

  const recommendations = generateRecommendations({
    tasks,
    goals,
    calendar,
    reminders,
    system,
    modules: getModules(),
  });
  recordExecution(Math.round(performance.now() - start));
  return recommendations;
}

export async function getRisks(): Promise<Risk[]> {
  const { tasks, projects } = await getTasksAndProjects();
  const taskSummary = await getTaskSummary();
  return analyzeRisks(tasks, projects, taskSummary);
}

export async function getDailyPlanData(): Promise<DailyPlan> {
  const { tasks } = await getTasksAndProjects();
  return generateDailyPlan(tasks);
}

export async function getWeeklyReviewData(): Promise<WeeklyReview> {
  const taskSummary = await getTaskSummary();
  const { projects } = await getTasksAndProjects();
  const productivity = calculateProductivity(
    taskSummary,
    projects.map((p) => p.progress),
  );
  const projectProgresses = projects.map((p) => ({
    name: p.project.name,
    percent: p.progress.percent,
  }));
  return generateWeeklyReview(taskSummary, projectProgresses, productivity.score);
}

export async function getProductivityData(): Promise<ProductivityScore> {
  const taskSummary = await getTaskSummary();
  const { projects } = await getTasksAndProjects();
  return calculateProductivity(
    taskSummary,
    projects.map((p) => p.progress),
  );
}

export async function getAIContextData(): Promise<AIContext> {
  const { tasks, projects } = await getTasksAndProjects();
  const taskSummary = await getTaskSummary();
  return buildAIContext(tasks, projects, taskSummary);
}

export async function getExecutiveSummary(): Promise<{
  briefingSummary: string[];
  risks: Risk[];
  riskScore: number;
  plan: DailyPlan;
  productivity: ProductivityScore;
  recommendations: Recommendation[];
  pendingApprovals: ApprovalItem[];
}> {
  const start = performance.now();
  const [recommendations, risks, plan, productivity] = await Promise.all([
    getRecommendations(),
    getRisks(),
    getDailyPlanData(),
    getProductivityData(),
  ]);

  const pendingApprovals = getApprovalQueue().getPending();

  const briefingSummary = [
    `Verimlilik: %${productivity.score} (${productivity.trend === 'improving' ? '↑ artıyor' : productivity.trend === 'declining' ? '↓ düşüyor' : '→ stabil'})`,
    `${risks.length} risk tespit edildi (skor: ${calculateOverallRiskScore(risks)})`,
    `${plan.slots.length} görev planlandı (${Math.round(plan.totalEstimatedMinutes / 60)} saat)`,
    `${recommendations.length} öneri, ${pendingApprovals.length} onay bekliyor`,
  ];

  recordExecution(Math.round(performance.now() - start));

  return {
    briefingSummary,
    risks,
    riskScore: calculateOverallRiskScore(risks),
    plan,
    productivity,
    recommendations,
    pendingApprovals,
  };
}

export async function getAIExecutiveStatus(): Promise<AIExecutiveStatus> {
  const system = await getSystemState();
  const provider = getConfiguredProvider();
  return {
    mode: provider ? 'ai-provider' : 'rule-engine',
    provider: provider?.provider,
    model: provider?.model,
    kernelPhase: system.kernelPhase,
    healthScore: system.healthScore,
    memoryActive: system.memoryEngineActive,
    agentsActive: system.agentSystemActive,
    lastExecutionAt,
    lastExecutionDurationMs,
    totalExecutions,
    fallbackMode: !provider,
  };
}

export async function askExecutive(question: string): Promise<string> {
  const context = await getAIContextData();
  const systemPrompt = buildExecutivePrompt(context);

  const response = await chatWithProvider([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ]);

  if (!response) {
    return 'AI sağlayıcı yapılandırılmamış. Kural motoru aktif — lütfen ayarlardan bir API anahtarı ekleyin.';
  }

  return response.content;
}

// ─── Sprint 11: Strategic Decision Engine API ─────────────────────────────────

export async function getDecisions(): Promise<ExplainableDecision[]> {
  const start = performance.now();
  const [recommendations, risks, taskSummary, goalSummary] = await Promise.all([
    getRecommendations(),
    getRisks(),
    getTaskSummary(),
    getGoalSummary(),
  ]);
  const decisions = runDecisionEngine({ risks, recommendations, taskSummary, goalSummary });
  recordExecution(Math.round(performance.now() - start));
  return decisions;
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const start = performance.now();
  const [{ tasks, projects }, taskSummary, productivity] = await Promise.all([
    getTasksAndProjects(),
    getTaskSummary(),
    getProductivityData(),
  ]);
  const opportunities = findOpportunities({
    tasks,
    projects,
    taskSummary,
    productivityScore: productivity.score,
  });
  recordExecution(Math.round(performance.now() - start));
  return opportunities;
}

export async function getGoalPriority(): Promise<PrioritizedGoal[]> {
  const start = performance.now();
  try {
    const supabase = await createClient();
    const repos = createRepositories(supabase);
    const { data: goals } = await repos.goals.findMany(
      { status: 'active' },
      { page: 1, pageSize: 100 },
    );
    const result = prioritizeGoals(goals as GoalRecord[]);
    recordExecution(Math.round(performance.now() - start));
    return result;
  } catch {
    return [];
  }
}

export async function runScenario(input: ScenarioInput): Promise<ScenarioResult> {
  const start = performance.now();
  const [taskSummary, { projects }, risks] = await Promise.all([
    getTaskSummary(),
    getTasksAndProjects(),
    getRisks(),
  ]);
  const productivity = await getProductivityData();
  const result = simulateScenario(input, {
    taskSummary,
    productivityScore: productivity.score,
    projectProgresses: projects.map((p) => ({
      name: p.project.name,
      percent: p.progress.percent,
      progress: p.progress,
    })),
    riskScore: calculateOverallRiskScore(risks),
  });
  recordExecution(Math.round(performance.now() - start));
  return result;
}

export function getDecisionHistoryData() {
  return {
    history: getDecisionHistory().getHistory(100),
    learningReport: getDecisionHistory().getLearningReport(),
  };
}

export function recordDecisionOutcome(id: string, outcome: 'accepted' | 'rejected') {
  return getDecisionHistory().resolveOutcome(id, outcome);
}

export async function getEnergyPlan(): Promise<DailyPlan> {
  const { tasks } = await getTasksAndProjects();
  return generateEnergyPlan(tasks);
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboardData> {
  const start = performance.now();
  const [taskSummary, goalSummary, { tasks, projects }] = await Promise.all([
    getTaskSummary(),
    getGoalSummary(),
    getTasksAndProjects(),
  ]);
  const [risks, productivity, goals] = await Promise.all([
    Promise.resolve(analyzeRisks(tasks, projects, taskSummary)),
    Promise.resolve(
      calculateProductivity(
        taskSummary,
        projects.map((p) => p.progress),
      ),
    ),
    (async () => {
      try {
        const supabase = await createClient();
        const repos = createRepositories(supabase);
        const { data } = await repos.goals.findMany(
          { status: 'active' },
          { page: 1, pageSize: 100 },
        );
        return data as GoalRecord[];
      } catch {
        return [];
      }
    })(),
  ]);
  const recommendations = generateRecommendations({
    tasks: taskSummary,
    goals: goalSummary,
    calendar: { eventsToday: 0, eventsThisWeek: 0 },
    reminders: { upcoming: 0, overdueCount: 0 },
    system: await getSystemState(),
    modules: getModules(),
  });
  const decisions = runDecisionEngine({ risks, recommendations, taskSummary, goalSummary });
  const opportunities = findOpportunities({
    tasks,
    projects,
    taskSummary,
    productivityScore: productivity.score,
  });
  const goalPriority = prioritizeGoals(goals);
  const pendingApprovals = getApprovalQueue().getPending();
  const riskScore = calculateOverallRiskScore(risks);
  const executiveScore = Math.round(
    productivity.score * 0.4 + (100 - riskScore) * 0.4 + (opportunities.length > 0 ? 20 : 10),
  );
  const topRec = recommendations[0];
  const focusRecommendation = topRec
    ? `Bugün odak: ${topRec.title}`
    : 'Tüm görevler dengede — odaklanmaya devam et.';
  const confidence = Math.round(
    decisions.filter((d) => d.confidence > 0).reduce((s, d) => s + d.confidence, 0) /
      Math.max(decisions.length, 1),
  );
  const briefingSummary = [
    `Verimlilik: %${productivity.score} (${productivity.trend === 'improving' ? '↑ artıyor' : productivity.trend === 'declining' ? '↓ düşüyor' : '→ stabil'})`,
    `${risks.length} risk tespit edildi (skor: ${riskScore})`,
    `${decisions.length} karar önerisi, ${pendingApprovals.length} onay bekliyor`,
    opportunities.length > 0
      ? `${opportunities.length} fırsat tespit edildi`
      : 'Fırsat taraması tamamlandı',
  ];

  recordExecution(Math.round(performance.now() - start));

  return {
    executiveScore: Math.min(100, executiveScore),
    riskScore,
    productivityScore: productivity.score,
    productivityTrend: productivity.trend,
    topRisks: risks.slice(0, 3),
    topOpportunities: opportunities.slice(0, 3),
    decisions: decisions.slice(0, 5),
    pendingApprovals,
    goalPriority: goalPriority.slice(0, 5),
    focusRecommendation,
    briefingSummary,
    confidence,
    generatedAt: new Date().toISOString(),
  };
}
