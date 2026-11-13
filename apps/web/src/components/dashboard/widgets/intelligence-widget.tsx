import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import type {
  IntelligenceScore,
  GoalProgress,
  LearningReport,
} from '@/lib/executive/optimization/types';
import { WidgetShell } from './widget-shell';

export interface IntelligenceWidgetProps {
  score: IntelligenceScore;
  topGoals: GoalProgress[];
  learning: LearningReport;
  recommendationCount: number;
  approvalRequired: number;
}

const DIM_LABELS: Record<string, string> = {
  trading: 'Trading',
  commerce: 'Commerce',
  workflow: 'Workflow',
  agent: 'Agent',
  productivity: 'Üretkenlik',
  learning: 'Öğrenme',
};

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-emerald-400',
  C: 'text-amber-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};

const STATUS_COLOR: Record<string, string> = {
  achieved: 'text-green-400',
  'on-track': 'text-emerald-400',
  behind: 'text-amber-400',
  'at-risk': 'text-red-400',
};

export function IntelligenceWidget({
  score,
  topGoals,
  learning,
  recommendationCount,
  approvalRequired,
}: IntelligenceWidgetProps) {
  const TrendIcon =
    score.trend === 'improving' ? TrendingUp : score.trend === 'declining' ? TrendingDown : Minus;
  const trendColor =
    score.trend === 'improving'
      ? 'text-green-400'
      : score.trend === 'declining'
        ? 'text-red-400'
        : 'text-muted-foreground';

  return (
    <WidgetShell
      title="Executive Intelligence"
      icon={<Brain className="h-4 w-4" />}
      action={
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${GRADE_COLOR[score.grade] ?? 'text-foreground'} bg-muted/40`}
        >
          <TrendIcon className={`h-3 w-3 ${trendColor}`} />
          {score.grade}
        </span>
      }
    >
      {/* Overall skor */}
      <div className="mb-3 flex items-end gap-2">
        <span className={`text-3xl font-bold ${GRADE_COLOR[score.grade] ?? 'text-foreground'}`}>
          {score.overall}
        </span>
        <span className="text-muted-foreground mb-1 text-[10px]">/100 · {score.trend}</span>
      </div>

      {/* 6 boyut */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {Object.entries(score.dimensions).map(([dim, val]) => (
          <div key={dim} className="bg-muted/30 rounded p-1.5 text-center">
            <p
              className={`text-[13px] font-bold ${val >= 70 ? 'text-green-400' : val >= 50 ? 'text-amber-400' : 'text-red-400'}`}
            >
              {val}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[9px]">{DIM_LABELS[dim] ?? dim}</p>
          </div>
        ))}
      </div>

      {/* Öneriler + öğrenme */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <Lightbulb className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Öneri:</span>
          <span className="text-foreground font-medium">{recommendationCount}</span>
          {approvalRequired > 0 && (
            <span className="text-amber-400">({approvalRequired} onay)</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <GraduationCap className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Ders:</span>
          <span className="text-foreground font-medium">{learning.totalLessons}</span>
          {learning.highRiskCount > 0 && (
            <span className="text-red-400">({learning.highRiskCount} yüksek risk)</span>
          )}
        </span>
      </div>

      {/* Öncelikli hedefler */}
      {topGoals.length === 0 ? (
        <p className="text-muted-foreground text-center text-[10px]">Hedef tanımlı değil</p>
      ) : (
        <div className="space-y-1">
          {topGoals.slice(0, 3).map((g) => (
            <div key={g.goal.id} className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5 truncate">
                <Target className="text-muted-foreground h-2.5 w-2.5 shrink-0" />
                <span className="text-foreground truncate">{g.goal.label}</span>
              </span>
              <span className={`shrink-0 ${STATUS_COLOR[g.status] ?? 'text-muted-foreground'}`}>
                %{Math.min(g.percent, 100)}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
