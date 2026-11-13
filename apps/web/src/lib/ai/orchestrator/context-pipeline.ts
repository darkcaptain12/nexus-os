import type {
  TaskSummary,
  GoalSummary,
  SystemState,
  NotificationSummary,
  Risk,
  ProductivityScore,
  ModuleStatus,
  GoalRecord,
} from '../types';
import type { TaskRecord, ProjectRecord, ProjectProgress } from '@/lib/repositories';
import { analyzeRisks, calculateOverallRiskScore } from '../risk-engine';
import { calculateProductivity } from '../productivity';
import { getConfiguredProvider } from '../providers';
import { getKernel } from '@/lib/kernel';
import { createRepositories } from '@/lib/repositories';
import { createClient } from '@/lib/supabase/server';
import { selectGraphContext } from '@/lib/knowledge/context-selector';
import type { GraphContextSelection } from '@/lib/knowledge/types';
import { getDesktopIntelligenceContext } from '@/lib/desktop-vision/services/desktop-vision-service';
import type { DesktopIntelligenceContext } from '@/lib/desktop-vision/types';

export interface OrchestratorContext {
  cycleId: string;
  taskSummary: TaskSummary;
  goalSummary: GoalSummary;
  tasks: TaskRecord[];
  projects: { project: ProjectRecord; progress: ProjectProgress }[];
  goals: GoalRecord[];
  system: SystemState;
  notifications: NotificationSummary;
  modules: ModuleStatus[];
  risks: Risk[];
  productivity: ProductivityScore;
  riskScore: number;
  desktopTopApps: { app: string; seconds: number }[];
  /** Context Builder v2: Knowledge Graph'tan seçilen en ilgili bilgiler */
  knowledge: GraphContextSelection;
  /** Context Builder v3: Desktop Intelligence bağlamı (ekran/OCR/clipboard/dosya) */
  desktop: DesktopIntelligenceContext;
  builtAt: string;
  buildDurationMs: number;
}

function buildModules(providerConfigured: boolean): ModuleStatus[] {
  return [
    { name: 'Kernel', enabled: true, status: 'active' },
    { name: 'Event Bus', enabled: true, status: 'active' },
    { name: 'Görevler', enabled: true, status: 'active' },
    { name: 'Projeler', enabled: true, status: 'active' },
    { name: 'Bellek', enabled: true, status: 'active' },
    {
      name: 'Yapay Zeka',
      enabled: providerConfigured,
      status: providerConfigured ? 'active' : 'unconfigured',
    },
    { name: 'Trading', enabled: false, status: 'disabled' },
    { name: 'Otomasyon', enabled: false, status: 'unconfigured' },
    { name: 'Bildirimler', enabled: true, status: 'active' },
  ];
}

/**
 * Builds the unified OrchestratorContext with a SINGLE Supabase client.
 * All downstream engines receive this context — no engine fetches DB on its own.
 */
export async function buildOrchestratorContext(cycleId: string): Promise<OrchestratorContext> {
  const t0 = performance.now();

  const supabase = await createClient();
  const repos = createRepositories(supabase);

  const { kernel, ready } = getKernel();
  await ready;
  const kernelStatus = kernel.getStatus();

  const system: SystemState = {
    kernelPhase: kernelStatus.phase,
    healthScore: kernelStatus.health,
    servicesTotal: kernelStatus.services.total,
    servicesRunning: kernelStatus.services.running,
    servicesFailed: kernelStatus.services.failed,
    eventsPublished: kernelStatus.events.published,
    commandsDispatched: kernelStatus.commands.dispatched,
    uptime: kernelStatus.uptime,
    aiProviderConfigured: !!getConfiguredProvider(),
    memoryEngineActive: true,
    agentSystemActive: false,
  };

  // Single parallel fetch — all data sources hit simultaneously
  const [taskSummaryResult, goalSummaryResult, notifResult, tasksResult, goalsResult] =
    await Promise.all([
      repos.tasks.getSummary().catch(() => ({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        dueToday: 0,
        highPriority: 0,
      })),
      repos.goals.getSummary().catch(() => ({
        total: 0,
        active: 0,
        completed: 0,
        averageProgress: 0,
      })),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .is('deleted_at', null)
        .then(({ count }: { count: number | null }) => ({ unread: count ?? 0, total: 0 }))
        .catch(() => ({ unread: 0, total: 0 })),
      repos.tasks
        .findFiltered({ parentId: null }, { page: 1, pageSize: 100 })
        .then(({ data }) => data)
        .catch(() => []),
      repos.goals
        .findMany({ status: 'active' }, { page: 1, pageSize: 100 })
        .then(({ data }) => data as GoalRecord[])
        .catch(() => []),
    ]);

  const projectList = await repos.projects
    .findFiltered({ preset: 'active' }, { page: 1, pageSize: 50 })
    .then(({ data }) => data)
    .catch(() => []);

  const projects = await Promise.all(
    projectList.map(async (proj) => {
      const progress = await repos.projects.getProgress(proj.id).catch(() => ({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        percent: 0,
      }));
      return { project: proj, progress };
    }),
  );

  // Desktop activity — optional, graceful if unavailable
  const today = new Date().toISOString().split('T')[0]!;
  const desktopTopApps = await repos.desktop.getTopApps(today, 5).catch(() => []);

  // Compute derived data once — all engines reuse
  const risks = analyzeRisks(tasksResult, projects, taskSummaryResult);
  const productivity = calculateProductivity(
    taskSummaryResult,
    projects.map((p) => p.progress),
  );
  const riskScore = calculateOverallRiskScore(risks);

  // Context Builder v2: graph'tan konu-odaklı seçim — en riskli görev veya
  // en aktif hedef konu olarak kullanılır; yoksa genel "görev" bağlamı.
  const topic =
    risks[0]?.title ?? goalsResult[0]?.title ?? tasksResult[0]?.title ?? 'görev proje karar';
  const knowledge = selectGraphContext(topic);

  // Context Builder v3: Desktop Intelligence — Memory + KG + Desktop + Trading + Agent birleşimi
  const desktop = getDesktopIntelligenceContext();

  const buildDurationMs = Math.round(performance.now() - t0);

  return {
    cycleId,
    taskSummary: taskSummaryResult,
    goalSummary: goalSummaryResult,
    tasks: tasksResult,
    projects,
    goals: goalsResult,
    system,
    notifications: notifResult,
    modules: buildModules(system.aiProviderConfigured),
    risks,
    productivity,
    riskScore,
    desktopTopApps,
    knowledge,
    desktop,
    builtAt: new Date().toISOString(),
    buildDurationMs,
  };
}
