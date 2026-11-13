import type { NextResponse } from 'next/server';

export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    );
  }

  return response;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

class InMemoryRateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now > entry.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(now + windowMs).toISOString(),
      };
    }

    entry.count++;
    const allowed = entry.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      resetAt: new Date(entry.resetAt).toISOString(),
    };
  }
}

let limiterInstance: InMemoryRateLimiter | null = null;

export function getRateLimiter(): InMemoryRateLimiter {
  if (!limiterInstance) limiterInstance = new InMemoryRateLimiter();
  return limiterInstance;
}

interface RateLimitGroupConfig {
  prefix: string;
  group: string;
  limit: number;
  windowMs: number;
}

/**
 * Per-route-group limits. No /api/upload exists in this app yet — omitted
 * rather than invented; will need an entry here the day an upload route
 * ships. Order matters: more specific prefixes must come before shorter
 * ones that would otherwise shadow them (none currently overlap, but keep
 * this in mind when adding new groups).
 */
const RATE_LIMIT_GROUPS: RateLimitGroupConfig[] = [
  { prefix: '/api/oauth', group: 'auth', limit: 10, windowMs: 60000 },
  { prefix: '/api/ai', group: 'ai', limit: 30, windowMs: 60000 },
  { prefix: '/api/memory', group: 'memory', limit: 60, windowMs: 60000 },
  { prefix: '/api/workflows', group: 'workflow', limit: 30, windowMs: 60000 },
  { prefix: '/api/actions', group: 'action', limit: 30, windowMs: 60000 },
  { prefix: '/api/desktop', group: 'desktop', limit: 120, windowMs: 60000 },
  { prefix: '/api/integrations', group: 'integration', limit: 30, windowMs: 60000 },
];
const DEFAULT_API_GROUP: RateLimitGroupConfig = {
  prefix: '/api',
  group: 'default',
  limit: 60,
  windowMs: 60000,
};

export function resolveRateLimitGroup(pathname: string): RateLimitGroupConfig {
  return RATE_LIMIT_GROUPS.find((g) => pathname.startsWith(g.prefix)) ?? DEFAULT_API_GROUP;
}

let rateLimitInvocations = 0;
let rateLimitRejections = 0;

/**
 * IP+user-keyed: identifier is the authenticated user id when available,
 * falling back to client IP for anonymous/public requests. Tracks how many
 * times this has actually been called so the security audit can report
 * "wired AND observed enforcing" (VERIFIED) vs. "wired but never hit yet"
 * (UNKNOWN) instead of asserting it works without evidence.
 */
export function checkApiRateLimit(
  pathname: string,
  identifier: string,
): RateLimitResult & { group: string } {
  rateLimitInvocations++;
  const config = resolveRateLimitGroup(pathname);
  const result = getRateLimiter().check(
    `${config.group}:${identifier}`,
    config.limit,
    config.windowMs,
  );
  if (!result.allowed) rateLimitRejections++;
  return { ...result, group: config.group };
}

export function getRateLimitInvocationCount(): number {
  return rateLimitInvocations;
}

export function getRateLimitRejections(): number {
  return rateLimitRejections;
}

export function getRateLimitGroups(): RateLimitGroupConfig[] {
  return [...RATE_LIMIT_GROUPS, DEFAULT_API_GROUP];
}
