import type {
  ToolDefinition,
  ToolCategory,
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolUsageStats,
} from './types';

export interface ToolRegistryService {
  register(tool: ToolDefinition): void;
  unregister(toolName: string): void;
  get(toolName: string): ToolDefinition | undefined;
  list(category?: ToolCategory): ToolDefinition[];
  search(query: string): ToolDefinition[];
  healthCheck(toolName: string): Promise<ToolDefinition>;
  healthCheckAll(): Promise<ToolDefinition[]>;
  getStats(toolName: string): Promise<ToolUsageStats>;
}

export interface ToolExecutor {
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResponse>;
  executeBatch(requests: ToolExecutionRequest[]): Promise<ToolExecutionResponse[]>;
  validateArguments(toolName: string, args: Record<string, unknown>): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: { parameter: string; message: string }[];
}

export interface ToolPermissionChecker {
  canExecute(userId: string, toolName: string): Promise<boolean>;
  getPermissions(toolName: string): string[];
  isRateLimited(toolName: string): boolean;
}
