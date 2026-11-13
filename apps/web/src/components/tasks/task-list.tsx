'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckSquare,
  Plus,
  Search,
  Circle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Tag,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  Square,
  CheckSquare2,
} from 'lucide-react';
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  updateTaskLabels,
  bulkUpdateTaskStatus,
  bulkDeleteTasks,
  bulkUpdateTaskPriority,
} from '@/lib/task-actions';
import { useRealtime } from '@/hooks/use-realtime';
import type { TaskRecord } from '@/lib/repositories';

interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  highPriority: number;
}

interface TaskListProps {
  tasks: TaskRecord[];
  summary: TaskSummary;
  allLabels: string[];
  currentFilters: {
    status?: string;
    priority?: string;
    search?: string;
    label?: string;
    preset?: string;
  };
  userId?: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: 'text-muted-foreground', label: 'Bekliyor' },
  in_progress: { icon: Clock, color: 'text-blue-400', label: 'Devam Ediyor' },
  completed: { icon: CheckCircle, color: 'text-green-400', label: 'Tamamlandı' },
  cancelled: { icon: XCircle, color: 'text-red-400', label: 'İptal' },
  blocked: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Engelli' },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  normal: 'border-l-blue-500',
  low: 'border-l-muted-foreground',
  background: 'border-l-muted',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Kritik',
  high: 'Yüksek',
  normal: 'Normal',
  low: 'Düşük',
  background: 'Arka Plan',
};

const SMART_FILTERS = [
  { key: 'today', label: 'Bugün', icon: Calendar },
  { key: 'tomorrow', label: 'Yarın', icon: Calendar },
  { key: 'this_week', label: 'Bu Hafta', icon: Calendar },
  { key: 'overdue', label: 'Gecikmiş', icon: AlertTriangle },
  { key: 'high_priority', label: 'Yüksek Öncelik', icon: AlertTriangle },
  { key: 'no_deadline', label: 'Tarihi Yok', icon: Clock },
];

export function TaskList({ tasks, summary, allLabels, currentFilters }: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string>();

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
    router.push(`/gorevler?${params.toString()}`);
  }

  async function handleCreate(formData: FormData) {
    setError(undefined);
    const result = await createTask(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      setShowQuickCreate(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  }

  async function handleBulkStatus(status: string) {
    await bulkUpdateTaskStatus([...selectedIds], status);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    await bulkDeleteTasks([...selectedIds]);
    setSelectedIds(new Set());
  }

  async function handleBulkPriority(priority: string) {
    await bulkUpdateTaskPriority([...selectedIds], priority);
    setSelectedIds(new Set());
  }

  async function handleRemoveLabel(taskId: string, task: TaskRecord, label: string) {
    await updateTaskLabels(
      taskId,
      task.labels.filter((l) => l !== label),
    );
  }

  const parentTasks = tasks.filter((t) => !t.parent_id);
  const subtaskMap = new Map<string, TaskRecord[]>();
  for (const t of tasks) {
    if (t.parent_id) {
      const list = subtaskMap.get(t.parent_id) ?? [];
      list.push(t);
      subtaskMap.set(t.parent_id, list);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Görevler</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary.total} görev · {summary.pending} bekliyor · {summary.inProgress} devam ediyor
            {summary.overdue > 0 && (
              <span className="text-red-400"> · {summary.overdue} gecikmiş</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="border-border text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
            title="Hızlı Oluştur"
          >
            <Plus className="h-4 w-4" /> Hızlı
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Yeni Görev
          </button>
        </div>
      </div>

      {/* Quick Create */}
      {showQuickCreate && (
        <form
          action={handleCreate}
          className="border-border bg-card flex items-center gap-2 rounded-xl border px-4 py-3"
        >
          <input
            name="title"
            placeholder="Görev başlığı..."
            required
            className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
          <select
            name="priority"
            defaultValue="normal"
            className="bg-muted rounded px-2 py-1 text-xs"
          >
            <option value="critical">Kritik</option>
            <option value="high">Yüksek</option>
            <option value="normal">Normal</option>
            <option value="low">Düşük</option>
          </select>
          <input name="due_date" type="date" className="bg-muted rounded px-2 py-1 text-xs" />
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            Ekle
          </button>
        </form>
      )}

      {/* Smart Filters */}
      <div className="flex flex-wrap gap-1.5">
        <Filter className="text-muted-foreground mr-1 h-4 w-4 self-center" />
        {SMART_FILTERS.map((sf) => (
          <button
            key={sf.key}
            onClick={() =>
              setFilter('preset', currentFilters.preset === sf.key ? undefined : sf.key)
            }
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
              currentFilters.preset === sf.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <sf.icon className="h-3 w-3" /> {sf.label}
          </button>
        ))}
        {allLabels.map((label) => (
          <button
            key={label}
            onClick={() => setFilter('label', currentFilters.label === label ? undefined : label)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
              currentFilters.label === label
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Tag className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { label: 'Toplam', value: summary.total, filter: undefined },
          { label: 'Bekliyor', value: summary.pending, filter: 'pending' },
          { label: 'Devam', value: summary.inProgress, filter: 'in_progress' },
          { label: 'Tamamlanan', value: summary.completed, filter: 'completed' },
          { label: 'Gecikmiş', value: summary.overdue, filter: undefined },
          { label: 'Bugün', value: summary.dueToday, filter: undefined },
          { label: 'Yüksek Öncl.', value: summary.highPriority, filter: undefined },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() =>
              setFilter('status', stat.filter === currentFilters.status ? undefined : stat.filter)
            }
            className={`border-border bg-card rounded-lg border p-2.5 text-center transition-colors ${stat.filter === currentFilters.status ? 'ring-primary ring-2' : ''}`}
          >
            <p className="text-foreground text-lg font-bold">{stat.value}</p>
            <p className="text-muted-foreground text-[10px]">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search + Priority Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Görev ara..."
            defaultValue={currentFilters.search}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length >= 2 || val.length === 0) setFilter('q', val || undefined);
            }}
            className="border-input bg-background placeholder:text-muted-foreground w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={currentFilters.priority ?? ''}
          onChange={(e) => setFilter('priority', e.target.value || undefined)}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Tüm Öncelikler</option>
          <option value="critical">Kritik</option>
          <option value="high">Yüksek</option>
          <option value="normal">Normal</option>
          <option value="low">Düşük</option>
        </select>
      </div>

      {/* Bulk Operations Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-muted flex items-center gap-3 rounded-lg px-4 py-2">
          <span className="text-foreground text-sm font-medium">{selectedIds.size} seçili</span>
          <button
            onClick={() => handleBulkStatus('completed')}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white"
          >
            Tamamla
          </button>
          <button
            onClick={() => handleBulkStatus('in_progress')}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
          >
            Başlat
          </button>
          <select
            onChange={(e) => {
              if (e.target.value) handleBulkPriority(e.target.value);
              e.target.value = '';
            }}
            className="bg-background rounded px-2 py-1 text-xs"
          >
            <option value="">Öncelik</option>
            <option value="critical">Kritik</option>
            <option value="high">Yüksek</option>
            <option value="normal">Normal</option>
            <option value="low">Düşük</option>
          </select>
          <button
            onClick={handleBulkDelete}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Sil
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground ml-auto text-xs"
          >
            Temizle
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form
          action={handleCreate}
          className="border-border bg-card space-y-3 rounded-xl border p-5"
        >
          <h2 className="text-foreground text-sm font-medium">Yeni Görev</h2>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <input
            name="title"
            placeholder="Görev başlığı"
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
              name="due_date"
              type="datetime-local"
              className="border-input bg-background flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <input
              name="labels"
              placeholder="Etiketler (virgülle)"
              className="border-input bg-background flex-1 rounded-lg border px-3 py-2 text-sm"
            />
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

      {/* Task List */}
      {parentTasks.length === 0 ? (
        <div className="border-border bg-card rounded-xl border py-12 text-center">
          <CheckSquare className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            {Object.values(currentFilters).some(Boolean)
              ? 'Filtreye uygun görev bulunamadı'
              : 'Henüz görev yok'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Select All */}
          <button
            onClick={selectAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-1 text-xs"
          >
            {selectedIds.size === tasks.length ? (
              <CheckSquare2 className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {selectedIds.size === tasks.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
          </button>

          {parentTasks.map((task) => {
            const subtasks = subtaskMap.get(task.id) ?? [];
            const isExpanded = expandedTasks.has(task.id);
            const statusConf = STATUS_CONFIG[task.status] ?? STATUS_CONFIG['pending']!;
            const StatusIcon = statusConf.icon;
            const isOverdue =
              task.due_date &&
              new Date(task.due_date) < new Date() &&
              task.status !== 'completed' &&
              task.status !== 'cancelled';
            const isSelected = selectedIds.has(task.id);
            const completedSubs = subtasks.filter((s) => s.status === 'completed').length;

            return (
              <div key={task.id}>
                <div
                  className={`border-border bg-card flex items-center gap-2 rounded-xl border border-l-4 px-3 py-2.5 ${PRIORITY_COLORS[task.priority] ?? ''} ${isSelected ? 'ring-primary ring-1' : ''}`}
                >
                  {/* Select */}
                  <button
                    onClick={() => toggleSelect(task.id)}
                    className="text-muted-foreground shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare2 className="text-primary h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  {/* Expand subtasks */}
                  {subtasks.length > 0 ? (
                    <button
                      onClick={() =>
                        setExpandedTasks((prev) => {
                          const n = new Set(prev);
                          if (n.has(task.id)) n.delete(task.id);
                          else n.add(task.id);
                          return n;
                        })
                      }
                      className="text-muted-foreground shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-4" />
                  )}

                  {/* Status toggle */}
                  <button
                    onClick={() =>
                      updateTaskStatus(
                        task.id,
                        task.status === 'completed'
                          ? 'pending'
                          : task.status === 'pending'
                            ? 'in_progress'
                            : 'completed',
                      )
                    }
                    className={`shrink-0 ${statusConf.color}`}
                    title={statusConf.label}
                  >
                    <StatusIcon className="h-4 w-4" />
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`truncate text-sm font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                      >
                        {task.title}
                      </p>
                      {subtasks.length > 0 && (
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {completedSubs}/{subtasks.length}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={`rounded px-1 py-0.5 ${PRIORITY_COLORS[task.priority]?.replace('border-l-', 'bg-') ?? 'bg-muted'}/20`}
                      >
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </span>
                      {task.due_date && (
                        <span className={isOverdue ? 'font-medium text-red-400' : ''}>
                          {new Date(task.due_date).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {isOverdue && ' ⚠️'}
                        </span>
                      )}
                      {task.labels.map((label) => (
                        <button
                          key={label}
                          onClick={() => handleRemoveLabel(task.id, task, label)}
                          className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 hover:line-through"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px]"
                    >
                      <option value="pending">Bekliyor</option>
                      <option value="in_progress">Devam</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="cancelled">İptal</option>
                      <option value="blocked">Engelli</option>
                    </select>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-muted-foreground p-1 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                {isExpanded && subtasks.length > 0 && (
                  <div className="ml-10 mt-1 space-y-1">
                    {subtasks.map((sub) => {
                      const subConf = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG['pending']!;
                      const SubIcon = subConf.icon;
                      return (
                        <div
                          key={sub.id}
                          className="border-border bg-card/50 flex items-center gap-2 rounded-lg border px-3 py-2"
                        >
                          <button
                            onClick={() =>
                              updateTaskStatus(
                                sub.id,
                                sub.status === 'completed' ? 'pending' : 'completed',
                              )
                            }
                            className={`shrink-0 ${subConf.color}`}
                          >
                            <SubIcon className="h-3.5 w-3.5" />
                          </button>
                          <p
                            className={`flex-1 truncate text-xs ${sub.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                          >
                            {sub.title}
                          </p>
                          <button
                            onClick={() => deleteTask(sub.id)}
                            className="text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {/* Add subtask inline */}
                    <form action={handleCreate} className="flex items-center gap-2 px-3 py-1">
                      <input type="hidden" name="parent_id" value={task.id} />
                      <input
                        name="title"
                        placeholder="Alt görev ekle..."
                        required
                        className="placeholder:text-muted-foreground flex-1 bg-transparent text-xs outline-none"
                      />
                      <button type="submit" className="text-primary text-xs font-medium">
                        Ekle
                      </button>
                    </form>
                  </div>
                )}

                {/* Subtask progress bar */}
                {subtasks.length > 0 && !isExpanded && (
                  <div className="bg-muted ml-10 mt-0.5 h-1 w-32 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{
                        width: `${subtasks.length > 0 ? (completedSubs / subtasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
