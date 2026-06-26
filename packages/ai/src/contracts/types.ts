export interface ServiceContract {
  name: string;
  version: string;
  provider: string;
  consumer: string;
  methods: ContractMethod[];
  events: ContractEvent[];
}

export interface ContractMethod {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  errors: string[];
  timeout: number;
}

export interface ContractEvent {
  name: string;
  payload: Record<string, unknown>;
  direction: 'publish' | 'subscribe';
}

export interface ProviderContract {
  provider: string;
  capabilities: string[];
  models: string[];
  rateLimits: { requestsPerMinute: number; tokensPerMinute: number };
  sla: { uptimePercent: number; maxLatencyMs: number };
}

export interface AgentContract {
  agentId: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  capabilities: string[];
  requiredTools: string[];
  requiredPermissions: string[];
  maxTokens: number;
  maxCost: number;
  timeout: number;
}
