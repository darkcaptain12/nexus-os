import { Network, GitBranch, Activity } from 'lucide-react';
import type { GraphStatistics } from '@/lib/knowledge/types';
import type { KnowledgeEdge, KnowledgeNode } from '@/lib/knowledge/types';
import { WidgetShell } from './widget-shell';

const TYPE_LABELS: Record<string, string> = {
  person: 'Kişi',
  company: 'Şirket',
  project: 'Proje',
  task: 'Görev',
  goal: 'Hedef',
  decision: 'Karar',
  meeting: 'Toplantı',
  note: 'Not',
  file: 'Dosya',
  website: 'Site',
  workflow: 'İş Akışı',
  agent: 'Agent',
  trade: 'Trade',
  strategy: 'Strateji',
  exchange: 'Borsa',
};

export interface KnowledgeWidgetProps {
  statistics: GraphStatistics;
  recentRelations: { edge: KnowledgeEdge; source: KnowledgeNode; target: KnowledgeNode }[];
}

export function KnowledgeWidget({ statistics, recentRelations }: KnowledgeWidgetProps) {
  const s = statistics;
  const topTypes = Object.entries(s.typeDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxTypeCount = topTypes[0]?.[1] ?? 1;

  return (
    <WidgetShell
      title="Knowledge Graph"
      icon={<Network className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          {s.nodeCount} node · {s.edgeCount} ilişki
        </span>
      }
    >
      {/* Sağlık + duplicate */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${s.memoryHealth >= 60 ? 'text-green-400' : s.memoryHealth >= 40 ? 'text-orange-400' : 'text-red-400'}`}
          >
            {s.memoryHealth}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Memory Health</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">
            %{Math.round(s.duplicateRatio * 100)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Duplicate</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{s.averageDegree}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Ort. Derece</p>
        </div>
      </div>

      {/* En bağlantılı node */}
      {s.mostConnected.length > 0 && (
        <div className="bg-muted/40 mb-2 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px]">
            <GitBranch className="text-primary h-3 w-3" />
            <span className="text-muted-foreground">En bağlantılı:</span>
          </div>
          {s.mostConnected.slice(0, 3).map((n) => (
            <div key={n.id} className="mt-0.5 flex items-center justify-between text-[10px]">
              <span className="text-foreground truncate">{n.name}</span>
              <span className="text-muted-foreground shrink-0">
                {TYPE_LABELS[n.type] ?? n.type} · {n.degree}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Entity dağılımı */}
      {topTypes.length > 0 && (
        <div className="mb-2 space-y-1">
          {topTypes.map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground w-14 shrink-0">
                {TYPE_LABELS[type] ?? type}
              </span>
              <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${(count / maxTypeCount) * 100}%` }}
                />
              </div>
              <span className="text-foreground w-6 shrink-0 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Son ilişkiler */}
      {recentRelations.length === 0 ? (
        <p className="text-muted-foreground py-3 text-center text-[10px]">
          Henüz ilişki yok — agent/trading aktivitesi graph'ı besler
        </p>
      ) : (
        <div className="space-y-1">
          {recentRelations.slice(0, 4).map(({ edge, source, target }) => (
            <div key={edge.id} className="flex items-center gap-1 text-[10px]">
              <Activity className="text-muted-foreground h-2.5 w-2.5 shrink-0" />
              <span className="text-foreground truncate">{source.name}</span>
              <span className="text-primary shrink-0">--{edge.relation}--&gt;</span>
              <span className="text-foreground truncate">{target.name}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
