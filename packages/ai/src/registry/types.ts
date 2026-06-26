import type { AgentDefinition, AgentHealth } from '../agents/types';

export interface RegistryEntry<T> {
  id: string;
  name: string;
  version: string;
  registeredAt: string;
  updatedAt: string;
  entry: T;
}

export interface AgentRegistryEntry extends RegistryEntry<AgentDefinition> {
  health: AgentHealth;
  enabled: boolean;
}

export interface RegistryFilter {
  status?: string;
  capability?: string;
  tag?: string;
  owner?: string;
  healthStatus?: string;
}

export interface RegistryStats {
  totalAgents: number;
  activeAgents: number;
  healthyAgents: number;
  totalExecutions: number;
  averageSuccessRate: number;
}
