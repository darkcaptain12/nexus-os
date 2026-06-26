export interface ApexSDKConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface ApexSDK {
  config: ApexSDKConfig;
  ai: AIModule;
  memory: MemoryModule;
  automation: AutomationModule;
  notifications: NotificationsModule;
}

interface AIModule {
  chat(messages: { role: string; content: string }[]): Promise<{ content: string }>;
  listModels(): Promise<{ id: string; name: string }[]>;
}

interface MemoryModule {
  store(content: string, metadata?: Record<string, unknown>): Promise<{ id: string }>;
  search(query: string, limit?: number): Promise<{ id: string; content: string; score: number }[]>;
}

interface AutomationModule {
  execute(workflowId: string, input?: Record<string, unknown>): Promise<{ executionId: string }>;
  listWorkflows(): Promise<{ id: string; name: string; status: string }[]>;
}

interface NotificationsModule {
  send(notification: { channel: string; title: string; body: string }): Promise<{ id: string }>;
}
