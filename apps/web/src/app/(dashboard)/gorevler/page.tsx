import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import { TaskList } from '@/components/tasks/task-list';
import type { TaskFilters } from '@/lib/repositories';

export const metadata = { title: 'Görevler — NEXUS OS' };

async function TasksContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repos = createRepositories(supabase);
  const userRecord = await repos.users.findByAuthId(user?.id ?? '');

  const filters: TaskFilters = {
    status: params.status,
    priority: params.priority,
    search: params.q,
    label: params.label,
    parentId: params.subtasks === 'all' ? undefined : null,
    preset: params.preset as TaskFilters['preset'],
  };

  const result = await repos.tasks.findFiltered(filters, { page: 1, pageSize: 100 });
  const summary = await repos.tasks.getSummary();
  const allLabels = await repos.tasks.getAllLabels();

  return (
    <TaskList
      tasks={result.data}
      summary={summary}
      allLabels={allLabels}
      currentFilters={{
        status: params.status,
        priority: params.priority,
        search: params.q,
        label: params.label,
        preset: params.preset,
      }}
      userId={userRecord.data?.id}
    />
  );
}

export default function GorevlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<TasksSkeleton />}>
        <TasksContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-border bg-card h-16 animate-pulse rounded-xl border" />
      ))}
    </div>
  );
}
