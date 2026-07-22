import type { VersionInfo } from './types';

// Version Manager — v1.0.0 sürüm bilgisi. Build number/commit/migration statik
// build-time değerleri (env override edilebilir). Yeni state tutmaz.

export const APEX_VERSION = '1.0.0';
export const MIGRATION_VERSION = 19; // supabase/migrations/ en son numara (019)
export const RELEASE_DATE = '2026-07-10';

export function getVersionInfo(): VersionInfo {
  return {
    version: APEX_VERSION,
    buildNumber:
      process.env.NEXT_PUBLIC_BUILD_NUMBER ?? `${APEX_VERSION}+${RELEASE_DATE.replace(/-/g, '')}`,
    releaseDate: RELEASE_DATE,
    commit: process.env.NEXT_PUBLIC_GIT_COMMIT ?? 'release',
    migrationVersion: MIGRATION_VERSION,
    nodeVersion: process.version,
    channel: 'stable',
  };
}
