import type { AgentDefinition } from '../agents/types';
import type { AgentRegistryEntry, RegistryFilter, RegistryStats } from './types';

export interface AgentRegistry {
  register(agent: AgentDefinition): Promise<AgentRegistryEntry>;
  unregister(agentId: string): Promise<void>;
  get(agentId: string): Promise<AgentRegistryEntry | null>;
  list(filter?: RegistryFilter): Promise<AgentRegistryEntry[]>;
  update(agentId: string, updates: Partial<AgentDefinition>): Promise<AgentRegistryEntry>;
  enable(agentId: string): Promise<void>;
  disable(agentId: string): Promise<void>;
  getStats(): Promise<RegistryStats>;
  findByCapability(capability: string): Promise<AgentRegistryEntry[]>;
  healthCheck(agentId: string): Promise<AgentRegistryEntry>;
}
