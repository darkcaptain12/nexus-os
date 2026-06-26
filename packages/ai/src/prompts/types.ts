export type PromptLayer = 'system' | 'developer' | 'user' | 'memory' | 'context' | 'tool';

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  layer: PromptLayer;
  template: string;
  variables: PromptVariable[];
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

export interface RenderedPrompt {
  templateId: string;
  content: string;
  variables: Record<string, unknown>;
  tokenCount: number;
  renderedAt: string;
}

export interface PromptComposition {
  systemPrompt: string;
  developerPrompt?: string;
  memoryInjection?: string;
  contextInjection?: string;
  userPrompt: string;
  totalTokens: number;
}

export interface PromptTestCase {
  id: string;
  templateId: string;
  variables: Record<string, unknown>;
  expectedOutput?: string;
  constraints: PromptTestConstraint[];
}

export interface PromptTestConstraint {
  type: 'contains' | 'not-contains' | 'max-tokens' | 'format' | 'tone';
  value: string;
}

export interface PromptTestResult {
  testId: string;
  passed: boolean;
  output: string;
  violations: string[];
  tokenCount: number;
  latencyMs: number;
}
