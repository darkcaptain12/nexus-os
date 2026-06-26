import type {
  PromptTemplate,
  RenderedPrompt,
  PromptComposition,
  PromptTestCase,
  PromptTestResult,
} from './types';

export interface PromptRegistry {
  register(template: PromptTemplate): void;
  get(id: string): PromptTemplate | undefined;
  getVersion(id: string, version: string): PromptTemplate | undefined;
  list(tags?: string[]): PromptTemplate[];
  render(id: string, variables: Record<string, unknown>): RenderedPrompt;
  delete(id: string): void;
}

export interface PromptComposer {
  compose(config: CompositionConfig): Promise<PromptComposition>;
}

export interface CompositionConfig {
  systemTemplateId?: string;
  developerTemplateId?: string;
  userMessage: string;
  memories?: string[];
  context?: string;
  variables?: Record<string, unknown>;
  maxTokens: number;
}

export interface PromptVersionManager {
  createVersion(templateId: string, template: string, changelog: string): Promise<PromptTemplate>;
  rollback(templateId: string, version: string): Promise<PromptTemplate>;
  compare(templateId: string, versionA: string, versionB: string): PromptDiff;
  getHistory(templateId: string): PromptTemplate[];
}

export interface PromptDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export interface PromptTester {
  test(testCase: PromptTestCase): Promise<PromptTestResult>;
  testBatch(testCases: PromptTestCase[]): Promise<PromptTestResult[]>;
}
