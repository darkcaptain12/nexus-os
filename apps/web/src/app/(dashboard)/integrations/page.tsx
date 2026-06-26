'use client';

import { useState, useEffect } from 'react';
import { Plug, Wifi, RefreshCw, Activity } from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  authMethod: string;
  capabilities: string[];
}

interface ConnectionInfo {
  id: string;
  providerId: string;
  state: string;
  connectedAt?: string;
  lastHealthCheck?: string;
  error?: string;
}

interface Stats {
  totalProviders: number;
  connectedProviders: number;
  totalActions: number;
  totalExecutions: number;
}

const STATE_COLORS: Record<string, string> = {
  connected: 'bg-green-500/20 text-green-400',
  disconnected: 'bg-muted text-muted-foreground',
  error: 'bg-red-500/20 text-red-400',
  connecting: 'bg-yellow-500/20 text-yellow-400',
};

const STATE_LABELS: Record<string, string> = {
  connected: 'Bağlı',
  disconnected: 'Bağlı Değil',
  error: 'Hata',
  connecting: 'Bağlanıyor',
};

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers);
        setConnections(data.connections);
        setStats(data.stats);
      })
      .catch(() => {});
  }, []);

  function getConnectionState(providerId: string): string {
    return connections.find((c) => c.providerId === providerId)?.state ?? 'disconnected';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Entegrasyonlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Harici servis bağlantıları</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatBox icon={<Plug className="h-4 w-4" />} label="Sağlayıcı" value={stats.totalProviders} />
          <StatBox icon={<Wifi className="h-4 w-4" />} label="Bağlı" value={stats.connectedProviders} />
          <StatBox icon={<Activity className="h-4 w-4" />} label="Eylem" value={stats.totalActions} />
          <StatBox icon={<RefreshCw className="h-4 w-4" />} label="Çalıştırılan" value={stats.totalExecutions} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const state = getConnectionState(provider.id);
          return (
            <div key={provider.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{provider.description}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATE_COLORS[state] ?? STATE_COLORS['disconnected']}`}>
                  {STATE_LABELS[state] ?? state}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {provider.capabilities.map((cap) => (
                  <span key={cap} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {cap}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{provider.category} · {provider.authMethod}</span>
                {state === 'disconnected' ? (
                  <button className="rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90">
                    Bağlan
                  </button>
                ) : (
                  <button className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/80">
                    Bağlantıyı Kes
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
