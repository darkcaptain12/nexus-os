'use client';

import { useState, useEffect } from 'react';
import { Zap, Clock, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';

interface ActionExecution {
  id: string;
  actionName: string;
  category: string;
  riskLevel: string;
  status: string;
  error?: string;
  durationMs?: number;
  createdAt: string;
}

interface ApprovalItem {
  id: string;
  actionName: string;
  riskLevel: string;
  description: string;
  requestedBy: string;
  createdAt: string;
}

interface Stats {
  registeredActions: number;
  queued: number;
  running: number;
  pendingApproval: number;
  completed: number;
  failed: number;
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  failed: XCircle,
  'pending-approval': AlertTriangle,
  running: Clock,
};

export default function ActionsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<ActionExecution[]>([]);
  const [pending, setPending] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/actions/history').then((r) => r.json()),
      fetch('/api/actions/pending').then((r) => r.json()),
    ]).then(([historyData, pendingData]) => {
      setStats(historyData.stats);
      setHistory(historyData.history);
      setPending(pendingData.pending);
    }).catch(() => {});
  }, []);

  async function handleApprove(approvalId: string) {
    await fetch('/api/actions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId }),
    });
    setPending((prev) => prev.filter((p) => p.id !== approvalId));
  }

  async function handleReject(approvalId: string) {
    await fetch('/api/actions/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId, reason: 'Kullanıcı tarafından reddedildi' }),
    });
    setPending((prev) => prev.filter((p) => p.id !== approvalId));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Eylemler</h1>
        <p className="mt-1 text-sm text-muted-foreground">Eylem motoru ve onay yönetimi</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBox icon={<Zap className="h-4 w-4" />} label="Kayıtlı Eylem" value={stats.registeredActions} />
          <StatBox icon={<Clock className="h-4 w-4" />} label="Kuyrukta" value={stats.queued + stats.running} />
          <StatBox icon={<Shield className="h-4 w-4" />} label="Onay Bekleyen" value={stats.pendingApproval} />
          <StatBox icon={<CheckCircle className="h-4 w-4" />} label="Tamamlanan" value={stats.completed} />
        </div>
      )}

      {pending.length > 0 && (
        <section className="rounded-xl border border-orange-500/30 bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Onay Bekleyen Eylemler ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.actionName}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${RISK_COLORS[item.riskLevel] ?? ''}`}>
                    {item.riskLevel.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">Eylem Geçmişi</h2>
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Henüz eylem yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((ex) => {
              const Icon = STATUS_ICONS[ex.status] ?? Clock;
              return (
                <div key={ex.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <Icon className={`h-4 w-4 ${ex.status === 'completed' ? 'text-green-400' : ex.status === 'failed' ? 'text-red-400' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{ex.actionName}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{ex.category}</span>
                      <span className={`rounded px-1 ${RISK_COLORS[ex.riskLevel] ?? ''}`}>{ex.riskLevel}</span>
                      {ex.durationMs !== undefined && <span>{ex.durationMs}ms</span>}
                    </div>
                  </div>
                  {ex.error && <p className="text-xs text-red-400">{ex.error}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
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
