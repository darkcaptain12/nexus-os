import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import { ProjectList } from '@/components/projects/project-list';
import type { ProjectFilters, ProjectProgress } from '@/lib/repositories';

export const metadata = { title: 'Projeler — NEXUS OS' };

async function ProjectsContent({
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

  const filters: ProjectFilters = {
    status: params.status,
    priority: params.priority,
    search: params.q,
    preset: params.preset as ProjectFilters['preset'],
  };

  const result = await repos.projects.findFiltered(filters, { page: 1, pageSize: 50 });
  const summary = await repos.projects.getSummary();

  const progressMap: Record<string, ProjectProgress> = {};
  for (const project of result.data) {
    progressMap[project.id] = await repos.projects.getProgress(project.id);
  }

  return (
    <ProjectList
      projects={result.data}
      summary={summary}
      progressMap={progressMap}
      currentFilters={{
        status: params.status,
        priority: params.priority,
        search: params.q,
        preset: params.preset,
      }}
      userId={userRecord.data?.id}
    />
  );
}

export default function ProjelerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-border bg-card h-28 animate-pulse rounded-xl border" />
            ))}
          </div>
        }
      >
        <ProjectsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
