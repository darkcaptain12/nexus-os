import type {
  EvaluationResult,
  EvaluationCriteria,
  HallucinationCheck,
  SuccessRateMetrics,
  FailureAnalysis,
} from './types';

export interface EvaluationEngine {
  evaluate(executionId: string, criteria: EvaluationCriteria[]): Promise<EvaluationResult>;
  evaluateBatch(executionIds: string[], criteria: EvaluationCriteria[]): Promise<EvaluationResult[]>;
  getResult(evaluationId: string): Promise<EvaluationResult | null>;
}

export interface HallucinationDetector {
  check(output: string, context: string[]): Promise<HallucinationCheck[]>;
  getHallucinationRate(agentId: string): Promise<number>;
}

export interface QualityScorer {
  scoreAccuracy(output: string, expected?: string): Promise<number>;
  scoreRelevance(output: string, query: string): Promise<number>;
  scoreCompleteness(output: string, requirements: string[]): Promise<number>;
  scoreCoherence(output: string): Promise<number>;
}

export interface SuccessTracker {
  record(executionId: string, success: boolean, agentId?: string): void;
  getMetrics(timeRange?: { from: string; to: string }): Promise<SuccessRateMetrics>;
  analyzeFailures(limit: number): Promise<FailureAnalysis[]>;
}
