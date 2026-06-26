export interface EvaluationResult {
  id: string;
  executionId: string;
  scores: EvaluationScores;
  details: EvaluationDetail[];
  overallScore: number;
  grade: EvaluationGrade;
  evaluatedAt: string;
}

export type EvaluationGrade = 'excellent' | 'good' | 'acceptable' | 'poor' | 'failing';

export interface EvaluationScores {
  accuracy: number;
  relevance: number;
  completeness: number;
  coherence: number;
  safety: number;
  latency: number;
  cost: number;
  confidence: number;
}

export interface EvaluationDetail {
  metric: string;
  score: number;
  explanation: string;
  evidence?: string;
}

export interface EvaluationCriteria {
  metric: string;
  weight: number;
  threshold: number;
  evaluator: 'automated' | 'llm-judge' | 'human';
}

export interface HallucinationCheck {
  claim: string;
  grounded: boolean;
  source?: string;
  confidence: number;
}

export interface SuccessRateMetrics {
  total: number;
  successful: number;
  failed: number;
  rate: number;
  byAgent: Record<string, { total: number; successful: number; rate: number }>;
}

export interface FailureAnalysis {
  executionId: string;
  failureType: 'timeout' | 'error' | 'hallucination' | 'safety' | 'quality' | 'cost-overrun';
  description: string;
  rootCause?: string;
  recommendation: string;
}
