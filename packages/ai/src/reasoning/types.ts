export type ReasoningMethod = 'chain' | 'tree' | 'reflection' | 'debate' | 'verification';

export interface ReasoningChain {
  id: string;
  method: ReasoningMethod;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  totalTokens: number;
  durationMs: number;
}

export interface ReasoningStep {
  step: number;
  thought: string;
  evidence?: string;
  action?: string;
  observation?: string;
  confidence: number;
  timestamp: string;
}

export interface ReasoningTree {
  root: TreeNode;
  bestPath: string[];
  exploredPaths: number;
  maxDepth: number;
}

export interface TreeNode {
  id: string;
  thought: string;
  score: number;
  children: TreeNode[];
  isLeaf: boolean;
  depth: number;
}

export interface Reflection {
  id: string;
  originalOutput: string;
  critique: string;
  suggestions: string[];
  revisedOutput: string;
  improvementScore: number;
}

export interface CriticResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendation: 'accept' | 'revise' | 'reject';
}

export interface VerificationResult {
  claim: string;
  verified: boolean;
  confidence: number;
  evidence: string[];
  contradictions: string[];
  method: 'factual' | 'logical' | 'empirical';
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  overallScore: number;
  mitigations: string[];
}

export interface RiskFactor {
  category: string;
  description: string;
  probability: number;
  impact: number;
  score: number;
}
