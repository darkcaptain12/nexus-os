import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import {
  generateDailyBriefing,
  getRecommendations,
  getExecutiveDashboard,
} from '@/lib/ai/executive';
import { getCycleEngine } from '@/lib/ai/orchestrator/cycle-engine';
import { getStateMachine } from '@/lib/ai/orchestrator/state-machine';
import { BriefingWidget } from '@/components/dashboard/widgets/briefing-widget';
import { SystemHealthWidget } from '@/components/dashboard/widgets/system-health-widget';
import { TasksWidget } from '@/components/dashboard/widgets/tasks-widget';
import { GoalsWidget } from '@/components/dashboard/widgets/goals-widget';
import { DesktopWidget } from '@/components/dashboard/widgets/desktop-widget';
import { TimelineWidget } from '@/components/dashboard/widgets/timeline-widget';
import { JournalWidget } from '@/components/dashboard/widgets/journal-widget';
import { ExecutiveWidget } from '@/components/dashboard/widgets/executive-widget';
import { AutomationWidget } from '@/components/dashboard/widgets/automation-widget';
import { AgentsWidget } from '@/components/dashboard/widgets/agents-widget';
import { KnowledgeWidget } from '@/components/dashboard/widgets/knowledge-widget';
import { DesktopVisionWidget } from '@/components/dashboard/widgets/desktop-vision-widget';
import { VoiceWidget } from '@/components/dashboard/widgets/voice-widget';
import { MobileWidget } from '@/components/dashboard/widgets/mobile-widget';
import { CommerceWidget } from '@/components/dashboard/widgets/commerce-widget';
import { LiveTradingWidget } from '@/components/dashboard/widgets/live-trading-widget';
import { DeveloperWidget } from '@/components/dashboard/widgets/developer-widget';
import { CloudWidget } from '@/components/dashboard/widgets/cloud-widget';
import { IntelligenceWidget } from '@/components/dashboard/widgets/intelligence-widget';
import { ProductionWidget } from '@/components/dashboard/widgets/production-widget';
import { ReleaseWidget } from '@/components/dashboard/widgets/release-widget';
import { devDashboard } from '@/lib/plugins/services/developer-platform-service';
import { cloudStatus } from '@/lib/cloud/services/cloud-service';
import {
  intelligenceScore,
  goalPriorities,
  learningReport,
  allRecommendations,
} from '@/lib/executive/optimization/services/self-optimization-service';
import { productionDashboard } from '@/lib/observability/production/services/production-service';
import { releaseDashboard } from '@/lib/release/services/release-service';
import { getPortfolioIntelligence } from '@/lib/quant/live/portfolio-intelligence';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { getLiveOrders } from '@/lib/quant/live/live-order-engine';
import { getLiveAlerts } from '@/lib/quant/live/live-alerts';
import { getAgentStore } from '@/lib/agents/agent-store';
import { commerceDashboard } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { getDesktopIntelligenceContext } from '@/lib/desktop-vision/services/desktop-vision-service';
import { voiceStatus, voiceCurrentConversation } from '@/lib/voice/services/voice-ai-service';
import { mobileSystemHealth } from '@/lib/mobile/services/mobile-service';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardRefresh } from '@/components/dashboard/dashboard-refresh';
import { CheckSquare, Target, Brain, Activity } from 'lucide-react';

export const metadata = { title: 'Dashboard — NEXUS OS' };

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repos = createRepositories(supabase);
  const profile = await repos.users.getFullProfile(user?.id ?? '');

  const userName =
    profile?.user.name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Kullanıcı';

  const timezone = profile?.profile.timezone ?? 'Europe/Istanbul';
  const locale = profile?.profile.locale ?? 'tr-TR';

  const briefing = await generateDailyBriefing({
    userId: user?.id ?? 'anonymous',
    name: userName,
    email: user?.email ?? '',
    timezone,
    locale,
  });

  const recommendations = await getRecommendations();
  const executiveDashboard = await getExecutiveDashboard();
  const cycleState = getStateMachine().getState();
  const currentCycle = getCycleEngine().getCurrent();
  const agentStore = getAgentStore();
  const agentList = agentStore.getAll(50);
  const agentMetrics = agentStore.getMetrics();
  const knowledgeGraph = getKnowledgeGraph();
  const knowledgeStats = knowledgeGraph.getStatistics();
  const recentRelations = knowledgeGraph.getRecentEdges(6);
  const desktopVisionContext = getDesktopIntelligenceContext();
  const voiceStatusData = voiceStatus();
  const voiceConversation = voiceCurrentConversation();
  const mobileHealth = mobileSystemHealth();
  const commerceIntel = await commerceDashboard();
  const livePortfolioData = await getPortfolioIntelligence().catch(() => null);
  const liveJournalStats = getJournalStats();
  const livePendingOrders = getLiveOrders().filter((o) => o.status === 'pending-approval').length;
  const liveAlertsData = getLiveAlerts(5);
  const developerDashboard = devDashboard();
  const cloudStatusData = cloudStatus();
  const [intelScore, goalPrio, learnReport, optRecs, productionData] = await Promise.all([
    intelligenceScore(),
    goalPriorities(),
    Promise.resolve(learningReport()),
    allRecommendations(),
    productionDashboard(),
  ]);
  const releaseData = await releaseDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">{briefing.greeting}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{briefing.date}</p>
      </div>

      <DashboardRefresh />
      <BriefingWidget briefing={briefing} />

      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium uppercase tracking-wider">
          Durum Özeti
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Aktif Görevler"
            value={briefing.taskSummary.pending + briefing.taskSummary.inProgress}
            subtitle={
              briefing.taskSummary.total === 0
                ? 'Görev ekleyin'
                : `${briefing.taskSummary.completed} tamamlandı`
            }
            icon={<CheckSquare className="h-4 w-4" />}
          />
          <StatCard
            title="Aktif Hedefler"
            value={briefing.goalSummary.active}
            subtitle={
              briefing.goalSummary.total === 0
                ? 'Hedef belirleyin'
                : `%${Math.round(briefing.goalSummary.averageProgress)} ilerleme`
            }
            icon={<Target className="h-4 w-4" />}
          />
          <StatCard
            title="AI Modu"
            value={briefing.generatedBy === 'rule-engine' ? 'Kural Motoru' : 'AI Aktif'}
            subtitle={`${briefing.durationMs}ms · ${recommendations.length} öneri`}
            icon={<Brain className="h-4 w-4" />}
          />
          <StatCard
            title="Sistem Sağlığı"
            value={`%${briefing.systemHealth.healthScore}`}
            subtitle={`${briefing.systemHealth.servicesRunning}/${briefing.systemHealth.servicesTotal} servis`}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExecutiveWidget
          {...executiveDashboard}
          cycleState={cycleState}
          currentCycle={currentCycle}
        />
        <TasksWidget tasks={briefing.taskSummary} />
        <GoalsWidget goals={briefing.goalSummary} />
        <SystemHealthWidget system={briefing.systemHealth} modules={briefing.modules} />
        <DesktopWidget />
        <AgentsWidget agents={agentList} metrics={agentMetrics} />
        <KnowledgeWidget statistics={knowledgeStats} recentRelations={recentRelations} />
        <DesktopVisionWidget context={desktopVisionContext} />
        <VoiceWidget status={voiceStatusData} currentConversation={voiceConversation} />
        <MobileWidget health={mobileHealth} />
        <CommerceWidget dashboard={commerceIntel} />
        {livePortfolioData && (
          <LiveTradingWidget
            portfolio={livePortfolioData}
            journalStats={liveJournalStats}
            pendingOrders={livePendingOrders}
            alerts={liveAlertsData}
          />
        )}
        <DeveloperWidget dashboard={developerDashboard} />
        <CloudWidget status={cloudStatusData} />
        <IntelligenceWidget
          score={intelScore}
          topGoals={goalPrio}
          learning={learnReport}
          recommendationCount={optRecs.length}
          approvalRequired={optRecs.filter((r) => r.requiresApproval).length}
        />
        <ProductionWidget data={productionData} />
        <ReleaseWidget data={releaseData} />
        <AutomationWidget />
        <TimelineWidget />
        <JournalWidget />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="bg-muted h-8 w-64 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-4 w-48 animate-pulse rounded" />
      </div>
      <div className="border-border bg-card h-32 animate-pulse rounded-xl border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-border bg-card h-24 animate-pulse rounded-xl border" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-border bg-card h-48 animate-pulse rounded-xl border" />
        ))}
      </div>
    </div>
  );
}
