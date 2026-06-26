'use client';

import { useState, useEffect } from 'react';
import { GitBranch, Play, Pause, Plus, Clock, CheckCircle, XCircle, Zap } from 'lucide-react';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: string;
  trigger: { type: string };
  tags: string[];
}

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Stats {
  totalWorkflows: number;
  enabledWorkflows: number;
  running: number;
  todayExecutions: number;
  todayFailures: number;
}

interface ExecutionItem {
  id: string;
  workflowName: string;
  phase: string;
  trigger: string;
  startedAt: string;
  durationMs?: number;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  enabled: 'bg-green-500/20 text-green-400',
  disabled: 'bg-muted text-muted-foreground',
  draft: 'bg-yellow-500/20 text-yellow-400',
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manuel', schedule: 'Zamanlayıcı', desktop: 'Masaüstü', webhook: 'Webhook',
  email: 'E-posta', calendar: 'Takvim', ai: 'AI', api: 'API', startup: 'Başlangıç',
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<ExecutionItem[]>([]);
  const [tab, setTab] = useState<'workflows' | 'templates' | 'history'>('workflows');

  useEffect(() => {
    Promise.all([
      fetch('/api/workflows').then((r) => r.json()),
      fetch('/api/workflows/history').then((r) => r.json()),
    ]).then(([wfData, histData]) => {
      setWorkflows(wfData.workflows);
      setTemplates(wfData.templates);
      setStats(wfData.stats);
      setHistory(histData.history);
    }).catch(() => {});
  }, []);

  async function createFromTemplate(templateId: string) {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
    });
    if (res.ok) {
      const wf = await res.json();
      setWorkflows((prev) => [...prev, wf]);
    }
  }

  async function runWorkflow(workflowId: string) {
    const res = await fetch('/api/workflows/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId }),
    });
    if (res.ok) {
      const execution = await res.json();
      setHistory((prev) => [execution, ...prev]);
    }
  }

  async function toggleWorkflow(workflowId: string, currentStatus: string) {
    const endpoint = currentStatus === 'enabled' ? '/api/workflows/disable' : '/api/workflows/enable';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWorkflows((prev) => prev.map((w) => (w.id === workflowId ? { ...w, status: updated.status } : w)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İş Akışları</h1>
          <p className="mt-1 text-sm text-muted-foreground">Otomasyon stüdyosu</p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatBox icon={<GitBranch className="h-4 w-4" />} label="Toplam" value={stats.totalWorkflows} />
          <StatBox icon={<Zap className="h-4 w-4" />} label="Aktif" value={stats.enabledWorkflows} />
          <StatBox icon={<Play className="h-4 w-4" />} label="Çalışan" value={stats.running} />
          <StatBox icon={<CheckCircle className="h-4 w-4" />} label="Bugün" value={stats.todayExecutions} />
        </div>
      )}

      <div className="flex gap-2">
        {(['workflows', 'templates', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {t === 'workflows' ? 'İş Akışları' : t === 'templates' ? 'Şablonlar' : 'Geçmiş'}
          </button>
        ))}
      </div>

      {tab === 'workflows' && (
        <div className="space-y-3">
          {workflows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <GitBranch className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Henüz iş akışı yok</p>
              <p className="mt-1 text-xs text-muted-foreground">Şablonlardan oluşturabilirsiniz</p>
            </div>
          ) : (
            workflows.map((wf) => (
              <div key={wf.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[wf.status] ?? ''}`}>{wf.status}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{wf.description}</p>
                  <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{TRIGGER_LABELS[wf.trigger.type] ?? wf.trigger.type}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => runWorkflow(wf.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    <Play className="h-3 w-3" />
                  </button>
                  <button onClick={() => toggleWorkflow(wf.id, wf.status)} className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80">
                    {wf.status === 'enabled' ? <Pause className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{tpl.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tpl.category}</span>
                <button onClick={() => createFromTemplate(tpl.id)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3 w-3" /> Oluştur
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-xl border border-border bg-card p-5">
          {history.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Henüz çalıştırma geçmişi yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  {ex.phase === 'completed' ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{ex.workflowName}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{TRIGGER_LABELS[ex.trigger] ?? ex.trigger}</span>
                      {ex.durationMs !== undefined && <span>{ex.durationMs}ms</span>}
                      <span>{new Date(ex.startedAt).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                  {ex.error && <span className="text-xs text-red-400">{ex.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
