import type { ServiceContract, ProviderContract, AgentContract } from './types';

export interface ContractRegistry {
  registerService(contract: ServiceContract): void;
  registerProvider(contract: ProviderContract): void;
  registerAgent(contract: AgentContract): void;
  getService(name: string): ServiceContract | undefined;
  getProvider(provider: string): ProviderContract | undefined;
  getAgent(agentId: string): AgentContract | undefined;
  validate(contractName: string, input: unknown): ContractValidationResult;
}

export interface ContractValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}
