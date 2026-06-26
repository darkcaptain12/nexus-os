import type { Provider } from './provider';
import type { ProviderMetadata, ProviderAction, ProviderCategory } from './types';

export class ProviderRegistry {
  private providers = new Map<string, Provider>();

  register(provider: Provider): void {
    this.providers.set(provider.metadata.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  get(providerId: string): Provider | undefined {
    return this.providers.get(providerId);
  }

  list(category?: ProviderCategory): ProviderMetadata[] {
    const all = [...this.providers.values()].map((p) => p.metadata);
    return category ? all.filter((m) => m.category === category) : all;
  }

  listConnected(): ProviderMetadata[] {
    return [...this.providers.values()]
      .filter((p) => p.isConnected())
      .map((p) => p.metadata);
  }

  getAllActions(): ProviderAction[] {
    return [...this.providers.values()].flatMap((p) => p.getActions());
  }

  getProviderActions(providerId: string): ProviderAction[] {
    return this.providers.get(providerId)?.getActions() ?? [];
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  count(): number {
    return this.providers.size;
  }
}
