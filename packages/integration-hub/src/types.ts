export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired' | 'refreshing';

export type AuthMethod = 'oauth2' | 'api-key' | 'bearer' | 'jwt' | 'basic' | 'none';

export type ProviderCategory = 'code' | 'email' | 'calendar' | 'mcp' | 'http' | 'storage' | 'commerce' | 'trading' | 'social';

export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  category: ProviderCategory;
  icon?: string;
  authMethod: AuthMethod;
  baseUrl?: string;
  scopes?: string[];
  capabilities: string[];
  version: string;
}

export interface ProviderCredentials {
  providerId: string;
  authMethod: AuthMethod;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  expiresAt?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface Connection {
  id: string;
  providerId: string;
  state: ConnectionState;
  userId: string;
  connectedAt?: string;
  lastSyncAt?: string;
  lastHealthCheck?: string;
  healthLatencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderAction {
  id: string;
  providerId: string;
  name: string;
  description: string;
  method: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  parameters: ProviderActionParameter[];
}

export interface ProviderActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
}

export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
  provider: string;
  action: string;
}

export interface ProviderHealth {
  providerId: string;
  healthy: boolean;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface RateLimitState {
  providerId: string;
  remaining: number;
  limit: number;
  resetsAt: string;
}

export interface IntegrationHubStats {
  totalProviders: number;
  connectedProviders: number;
  totalActions: number;
  totalExecutions: number;
  failedExecutions: number;
  avgLatencyMs: number;
}
