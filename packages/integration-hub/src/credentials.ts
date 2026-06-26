import type { ProviderCredentials, AuthMethod } from './types';

export class CredentialManager {
  private store = new Map<string, ProviderCredentials>();

  set(providerId: string, credentials: ProviderCredentials): void {
    this.store.set(providerId, { ...credentials, providerId });
  }

  get(providerId: string): ProviderCredentials | undefined {
    return this.store.get(providerId);
  }

  remove(providerId: string): void {
    this.store.delete(providerId);
  }

  has(providerId: string): boolean {
    return this.store.has(providerId);
  }

  isExpired(providerId: string): boolean {
    const cred = this.store.get(providerId);
    if (!cred?.expiresAt) return false;
    return new Date(cred.expiresAt) < new Date();
  }

  updateToken(providerId: string, accessToken: string, expiresAt?: string, refreshToken?: string): void {
    const existing = this.store.get(providerId);
    if (!existing) return;
    existing.accessToken = accessToken;
    if (expiresAt) existing.expiresAt = expiresAt;
    if (refreshToken) existing.refreshToken = refreshToken;
  }

  listProviders(): string[] {
    return [...this.store.keys()];
  }

  getAuthMethod(providerId: string): AuthMethod | undefined {
    return this.store.get(providerId)?.authMethod;
  }

  clear(): void {
    this.store.clear();
  }
}
