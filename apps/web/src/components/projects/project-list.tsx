'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle,
  Clock,
  Pause,
  PenLine,
  Calendar,
} from 'lucide-react';
import {
  createProject,
  updateProjectStatus,
  deleteProject,
  archiveProject,
  restoreProject,
} from '@/lib/project-actions';
import { useRealtime } from '@/hooks/use-realtime';
import type { ProjectRecord, ProjectProgress } from '@/lib/repositories';

interface ProjectSummary {
  total: number;
  active: number;
  planning: number;
  completed: number;
  archived: number;
  onHold: number;
}

interface ProjectListProps {
  projects: ProjectRecord[];
  summary: ProjectSummary;
  progressMap: Record<string, ProjectProgress>;
  currentFilters: { status?: string; priority?: string; search?: string; preset?: string };
  userId?: string;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; label: string; bg: string }
> = {
  planning: { icon: PenLine, color: 'text-purple-400', label: 'Planlama', bg: 'bg-purple-500/20' },
  active: { icon: Clock, color: 'text-blue-400', label: 'Aktif', bg: 'bg-blue-500/20' },
  on_hold: { icon: Pause, color: 'text-yellow-400', label: 'Beklemede', bg: 'bg-yellow-500/20' },
  completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    label: 'Tamamlandı',
    bg: 'bg-green-500/20',
  },
  archived: { icon: Archive, color: 'text-muted-foreground', label: 'Arşiv', bg: 'bg-muted' },
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Kritik',
  high: 'Yüksek',
  normal: 'Normal',
  low: 'Düşük',
};
const PRIORITY_DOTS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-muted-foreground',
};

const SMART_FILTERS = [
  { key: 'active', label: 'Aktif' },
  { key: 'completed', label: 'Tamamlanan' },
  { key: 'archived', label: 'Arşiv' },
  { key: 'recent', label: 'Son Güncellenen' },
  { key: 'high_priority', label: 'Yüksek Öncelik' },
];

const PROJECT_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

export function ProjectList({ projects, summary, progressMap, currentFilters }: ProjectListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  useRealtime(
    { table: 'projects' },
    useCallback(() => {
      startTransition(() => router.refresh());
    }, [router]),
  );

  useRealtime(
    { table: 'tasks' },
    useCallback(() => {
      startTransition(() => router.refresh());
    }, [router]),
  );

  function setFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'preset') params.delete('preset');
    if (key === 'preset') {
      params.delete('status');
      params.delete('priority');
    }
    router.push(`/projeler?${params.toString()}`);
  }

  async function handleCreate(formData: FormData) {
    setError(undefined);
    const result = await createProject(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Projeler</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary.total} proje · {summary.active} aktif · {summary.planning} planlama
            {summary.onHold > 0 && ` · ${summary.onHold} beklemede`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Yeni Proje
        </button>
      </div>

      {/* Smart Filters */}
      <div className="flex flex-wrap gap-1.5">
        <Filter className="text-muted-foreground mr-1 h-4 w-4 self-center" />
        {SMART_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() =>
              setFilter('preset', currentFilters.preset === sf.key ? undefined : sf.key)
            }
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              currentFilters.preset === sf.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Toplam', value: summary.total },
          { label: 'Aktif', value: summary.active },
          { label: 'Planlama', value: summary.planning },
          { label: 'Beklemede', value: summary.onHold },
          { label: 'Tamamlanan', value: summary.completed },
          { label: 'Arşiv', value: summary.archived },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border-border bg-card rounded-lg border p-2.5 text-center"
          >
            <p className="text-foreground text-lg font-bold">{stat.value}</p>
            <p className="text-muted-foreground text-[10px]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Proje ara..."
          defaultValue={currentFilters.search}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length >= 2 || v.length === 0) setFilter('q', v || undefined);
          }}
          className="border-input bg-background placeholder:text-muted-foreground w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
        />
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          action={handleCreate}
          className="border-border bg-card space-y-3 rounded-xl border p-5"
        >
          <h2 className="text-foreground text-sm font-medium">Yeni Proje</h2>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <input
            name="name"
            placeholder="Proje adı"
            required
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="Açıklama (opsiyonel)"
            rows={2}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <select
              name="status"
              defaultValue="planning"
              className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
            >
              <option value="planning">Planlama</option>
              <option value="active">Aktif</option>
              <option value="on_hold">Beklemede</option>
            </select>
            <select
              name="priority"
              defaultValue="normal"
              className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
            >
              <option value="critical">Kritik</option>
              <option value="high">Yüksek</option>
              <option value="normal">Normal</option>
              <option value="low">Düşük</option>
            </select>
            <input
              name="start_date"
              type="date"
              className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
            />
            <input
              name="end_date"
              type="date"
              className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Renk:</span>
            {PROJECT_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} className="peer sr-only" />
                <div
                  className="peer-checked:ring-offset-background h-5 w-5 rounded-full peer-checked:ring-2 peer-checked:ring-offset-2"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Oluştur
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-muted text-muted-foreground rounded-lg px-4 py-2 text-sm"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Project List */}
      {projects.length === 0 ? (
        <div className="border-border bg-card rounded-xl border py-12 text-center">
          <FolderKanban className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            {Object.values(currentFilters).some(Boolean)
              ? 'Filtreye uygun proje bulunamadı'
              : 'Henüz proje yok'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusConf = STATUS_CONFIG[project.status] ?? STATUS_CONFIG['active']!;
            const StatusIcon = statusConf.icon;
            const progress = progressMap[project.id] ?? {
              totalTasks: 0,
              completedTasks: 0,
              percent: 0,
              pendingTasks: 0,
              inProgressTasks: 0,
              overdueTasks: 0,
            };

            return (
              <div
                key={project.id}
                className="border-border bg-card overflow-hidden rounded-xl border"
              >
                {/* Color bar */}
                <div className="h-1.5" style={{ backgroundColor: project.color ?? '#3b82f6' }} />

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground truncate text-sm font-semibold">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div
                      className={`ml-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${statusConf.bg} ${statusConf.color}`}
                    >
                      <StatusIcon className="h-3 w-3" /> {statusConf.label}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{progress.totalTasks} görev</span>
                      <span className="text-foreground font-medium">%{progress.percent}</span>
                    </div>
                    <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress.percent}%`,
                          backgroundColor: project.color ?? '#3b82f6',
                        }}
                      />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-0.5">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${PRIORITY_DOTS[project.priority] ?? ''}`}
                      />
                      {PRIORITY_LABELS[project.priority] ?? project.priority}
                    </span>
                    {progress.overdueTasks > 0 && (
                      <span className="text-red-400">{progress.overdueTasks} gecikmiş</span>
                    )}
                    {project.start_date && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.start_date).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {project.end_date &&
                          ` — ${new Date(project.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-border mt-3 flex gap-1 border-t pt-3">
                    <select
                      value={project.status}
                      onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                      className="bg-muted text-muted-foreground flex-1 rounded px-2 py-1 text-[10px]"
                    >
                      <option value="planning">Planlama</option>
                      <option value="active">Aktif</option>
                      <option value="on_hold">Beklemede</option>
                      <option value="completed">Tamamlandı</option>
                    </select>
                    {project.status !== 'archived' ? (
                      <button
                        onClick={() => archiveProject(project.id)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        title="Arşivle"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => restoreProject(project.id)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        title="Geri Yükle"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-muted-foreground p-1 hover:text-red-400"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
