import type {
  ReasoningChain,
  ReasoningMethod,
  ReasoningTree,
  Reflection,
  CriticResult,
  VerificationResult,
  RiskAssessment,
} from './types';

export interface ReasoningEngine {
  reason(prompt: string, method: ReasoningMethod): Promise<ReasoningChain>;
  getChain(chainId: string): Promise<ReasoningChain | null>;
}

export interface ChainOfThought {
  think(prompt: string, maxSteps: number): Promise<ReasoningChain>;
}

export interface TreeOfThought {
  explore(prompt: string, breadth: number, depth: number): Promise<ReasoningTree>;
  evaluate(node: import('./types').TreeNode): number;
  prune(tree: ReasoningTree, threshold: number): ReasoningTree;
}

export interface ReflectionEngine {
  reflect(output: string, criteria: string[]): Promise<Reflection>;
  iterateReflection(output: string, maxIterations: number): Promise<Reflection[]>;
}

export interface CriticEngine {
  critique(output: string, criteria: string[]): Promise<CriticResult>;
}

export interface VerificationEngine {
  verify(claims: string[]): Promise<VerificationResult[]>;
  crossReference(claim: string, sources: string[]): Promise<VerificationResult>;
}

export interface RiskAnalyzer {
  assess(action: string, context: Record<string, unknown>): Promise<RiskAssessment>;
  assessPlan(tasks: string[]): Promise<RiskAssessment>;
}
