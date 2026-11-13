import { Brain, AlertTriangle, TrendingUp, Shield, Zap, Target, Activity } from 'lucide-react';
import type { ExecutiveDashboardData, ExecutiveState, ExecutiveCycle } from '@/lib/ai/types';
import { WidgetShell } from './widget-shell';

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-muted-foreground',
};

const IMPACT_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400',
  high: 'bg-orange-500/10 text-orange-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  low: 'bg-muted text-muted-foreground',
};

const STATE_COLORS: Record<ExecutiveState, string> = {
  IDLE: 'text-muted-foreground',
  COLLECTING_CONTEXT: 'text-blue-400',
  ANALYZING: 'text-blue-400',
  GENERATING_OPTIONS: 'text-purple-400',
  WAITING_APPROVAL: 'text-orange-400',
  EXECUTING: 'text-green-400',
  LEARNING: 'text-cyan-400',
  FAILED: 'text-red-400',
};

const STATE_LABELS: Record<ExecutiveState, string> = {
  IDLE: 'Bekliyor',
  COLLECTING_CONTEXT: 'Bağlam Alınıyor',
  ANALYZING: 'Analiz',
  GENERATING_OPTIONS: 'Seçenekler Üretiliyor',
  WAITING_APPROVAL: 'Onay Bekliyor',
  EXECUTING: 'Çalışıyor',
  LEARNING: 'Öğreniyor',
  FAILED: 'Hata',
};

export interface ExecutiveWidgetProps extends ExecutiveDashboardData {
  cycleState?: ExecutiveState;
  currentCycle?: ExecutiveCycle | null;
  learningTrend?: 'improving' | 'declining' | 'stable';
}

export function ExecutiveWidget(props: ExecutiveWidgetProps) {
  const {
    executiveScore,
    riskScore,
    productivityScore,
    productivityTrend,
    briefingSummary,
    topRisks,
    topOpportunities,
    decisions,
    pendingApprovals,
    goalPriority,
    focusRecommendation,
    confidence,
    cycleState,
    currentCycle,
    learningTrend,
  } = props;

  return (
    <WidgetShell
      title="AI Executive"
      icon={<Brain className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          {executiveScore} puan
        </span>
      }
    >
      {/* Cycle Status */}
      {(cycleState || currentCycle) && (
        <div className="bg-muted/30 mb-2 flex items-center justify-between rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <Activity className="text-muted-foreground h-3 w-3" />
            <span
              className={`text-[10px] font-medium ${cycleState ? STATE_COLORS[cycleState] : 'text-muted-foreground'}`}
            >
              {cycleState ? STATE_LABELS[cycleState] : 'IDLE'}
            </span>
          </div>
          {currentCycle && (
            <div className="text-muted-foreground flex items-center gap-2 text-[9px]">
              {currentCycle.decisionCount > 0 && <span>{currentCycle.decisionCount} karar</span>}
              {currentCycle.confidenceAverage > 0 && (
                <span>%{Math.round(currentCycle.confidenceAverage)} güven</span>
              )}
              {currentCycle.durationMs && <span>{currentCycle.durationMs}ms</span>}
              {learningTrend && (
                <span
                  className={
                    learningTrend === 'improving'
                      ? 'text-green-400'
                      : learningTrend === 'declining'
                        ? 'text-red-400'
                        : 'text-muted-foreground'
                  }
                >
                  {learningTrend === 'improving' ? '↑' : learningTrend === 'declining' ? '↓' : '→'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Focus Recommendation */}
      <div className="bg-primary/5 border-primary/20 rounded-lg border px-3 py-2">
        <p className="text-foreground text-[10px] font-medium">{focusRecommendation}</p>
        <p className="text-muted-foreground mt-0.5 text-[9px]">Güven: %{confidence}</p>
      </div>

      {/* Summary Lines */}
      <div className="mt-2 space-y-0.5">
        {briefingSummary.map((line, i) => (
          <p key={i} className="text-muted-foreground text-[10px]">
            {line}
          </p>
        ))}
      </div>

      {/* Productivity */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Verimlilik
          </span>
          <span className="text-foreground font-medium">
            %{productivityScore}{' '}
            {productivityTrend === 'improving'
              ? '↑'
              : productivityTrend === 'declining'
                ? '↓'
                : '→'}
          </span>
        </div>
        <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${productivityScore}%` }}
          />
        </div>
      </div>

      {/* Decisions */}
      {decisions.length > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-medium">
            <Brain className="h-3 w-3" /> Kararlar
          </p>
          <div className="space-y-1">
            {decisions.slice(0, 2).map((d) => (
              <div key={d.id} className="bg-muted/50 rounded px-2 py-1.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-foreground flex-1 text-[10px] font-medium leading-tight">
                    {d.decision}
                  </p>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${IMPACT_COLORS[d.impact] ?? ''}`}
                  >
                    {d.impact}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-[9px]">
                  %{d.confidence} güven · {d.evidence.length} kanıt
                </p>
                {d.requiresApproval && (
                  <p className="mt-0.5 text-[9px] text-orange-400">⚠ Onay gerekli</p>
                )}
              </div>
            ))}
            {decisions.length > 2 && (
              <p className="text-muted-foreground text-[9px]">+{decisions.length - 2} karar daha</p>
            )}
          </div>
        </div>
      )}

      {/* Top Risks */}
      {topRisks.length > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-medium">
            <Shield className="h-3 w-3" /> Riskler ({riskScore} puan)
          </p>
          <div className="space-y-1">
            {topRisks.slice(0, 2).map((risk) => (
              <div key={risk.id} className="bg-muted/50 rounded px-2 py-1.5">
                <p className={`text-[10px] font-medium ${RISK_COLORS[risk.level] ?? ''}`}>
                  {risk.title}
                </p>
                <p className="text-muted-foreground text-[9px]">{risk.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Opportunities */}
      {topOpportunities.length > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-medium">
            <Zap className="h-3 w-3" /> Fırsatlar
          </p>
          <div className="space-y-1">
            {topOpportunities.slice(0, 2).map((opp) => (
              <div key={opp.id} className="bg-muted/50 rounded px-2 py-1.5">
                <p className="text-foreground text-[10px] font-medium">{opp.title}</p>
                <p className="text-muted-foreground text-[9px]">{opp.estimatedBenefit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal Priority */}
      {goalPriority.length > 0 && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-medium">
            <Target className="h-3 w-3" /> Hedef Önceliği
          </p>
          <div className="space-y-0.5">
            {goalPriority.slice(0, 3).map((goal, i) => (
              <div key={goal.goalId} className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                <span className="text-foreground flex-1 truncate">{goal.title}</span>
                <span className="text-muted-foreground shrink-0">%{goal.priorityScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1 text-[10px] font-medium text-orange-400">
            <AlertTriangle className="h-3 w-3" /> {pendingApprovals.length} onay bekliyor
          </p>
        </div>
      )}
    </WidgetShell>
  );
}
