import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import { generateDailyBriefing, getRecommendations } from '@/lib/ai/executive';
import { BriefingWidget } from '@/components/dashboard/widgets/briefing-widget';
import { RecommendationsWidget } from '@/components/dashboard/widgets/recommendations-widget';
import { SystemHealthWidget } from '@/components/dashboard/widgets/system-health-widget';
import { TasksWidget } from '@/components/dashboard/widgets/tasks-widget';
import { GoalsWidget } from '@/components/dashboard/widgets/goals-widget';
import { DesktopWidget } from '@/components/dashboard/widgets/desktop-widget';
import { TimelineWidget } from '@/components/dashboard/widgets/timeline-widget';
import { JournalWidget } from '@/components/dashboard/widgets/journal-widget';
import { StatCard } from '@/components/dashboard/stat-card';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">{briefing.greeting}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{briefing.date}</p>
      </div>

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
        <TasksWidget tasks={briefing.taskSummary} />
        <RecommendationsWidget recommendations={recommendations} />
        <GoalsWidget goals={briefing.goalSummary} />
        <SystemHealthWidget system={briefing.systemHealth} modules={briefing.modules} />
        <DesktopWidget />
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
