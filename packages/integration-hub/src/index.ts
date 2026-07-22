export type {
  ConnectionState,
  AuthMethod,
  ProviderCategory,
  ProviderMetadata,
  ProviderCredentials,
  Connection,
  ProviderAction,
  ProviderActionParameter,
  ExecuteResult,
  ProviderHealth,
  OAuthConfig,
  RateLimitState,
  IntegrationHubStats,
} from './types';

export type { Provider } from './provider';
export { BaseProvider } from './provider';
export { ProviderRegistry } from './registry';
export { CredentialManager } from './credentials';
export { ConnectionManager } from './connections';
export { RateLimiter } from './rate-limit';
export { IntegrationHub } from './hub';
export { SyncEngine } from './sync-engine';
export type { SyncJob, SyncResult, SyncMetrics, SyncMode, SyncStatus } from './sync-engine';
export { EventBridge, createDefaultMappings } from './event-bridge';
export type { ExternalEvent, EventMapping } from './event-bridge';

export {
  GitHubProvider,
  GmailProvider,
  GoogleCalendarProvider,
  MCPProvider,
  HTTPProvider,
  NotionProvider,
  SlackProvider,
} from './providers';
