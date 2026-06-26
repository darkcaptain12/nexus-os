export type AIProviderName = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export type FinishReason = 'stop' | 'tool_use' | 'max_tokens' | 'error' | 'cancelled';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  maxRetries?: number;
  timeout?: number;
}

export interface AIModel {
  id: string;
  provider: AIProviderName;
  name: string;
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: ModelCapability[];
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
}

export type ModelCapability =
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'vision'
  | 'audio'
  | 'tool_use'
  | 'json_mode'
  | 'streaming'
  | 'code';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
  toolCalls?: AIToolCall[];
  toolCallId?: string;
}

export interface AIResponse {
  id: string;
  model: string;
  provider: AIProviderName;
  content: string;
  toolCalls?: AIToolCall[];
  usage: TokenUsage;
  finishReason: FinishReason;
  latencyMs: number;
  timestamp: string;
}

export interface AIStreamChunk {
  id: string;
  delta: string;
  toolCall?: AIToolCall;
  finishReason?: FinishReason;
}

export interface AIStreamResponse {
  id: string;
  model: string;
  provider: AIProviderName;
  stream: AsyncIterable<AIStreamChunk>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  tools?: AIToolDefinition[];
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  timeout?: number;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
