import type { RateLimitState } from './types';

export class RateLimiter {
  private limits = new Map<string, { remaining: number; limit: number; resetsAt: number }>();

  configure(providerId: string, limit: number, windowMs: number): void {
    this.limits.set(providerId, {
      remaining: limit,
      limit,
      resetsAt: Date.now() + windowMs,
    });
  }

  consume(providerId: string): boolean {
    const state = this.limits.get(providerId);
    if (!state) return true;

    if (Date.now() > state.resetsAt) {
      state.remaining = state.limit;
      state.resetsAt = Date.now() + 60000;
    }

    if (state.remaining <= 0) return false;
    state.remaining--;
    return true;
  }

  getState(providerId: string): RateLimitState | undefined {
    const state = this.limits.get(providerId);
    if (!state) return undefined;
    return {
      providerId,
      remaining: state.remaining,
      limit: state.limit,
      resetsAt: new Date(state.resetsAt).toISOString(),
    };
  }

  isLimited(providerId: string): boolean {
    const state = this.limits.get(providerId);
    if (!state) return false;
    if (Date.now() > state.resetsAt) return false;
    return state.remaining <= 0;
  }
}
