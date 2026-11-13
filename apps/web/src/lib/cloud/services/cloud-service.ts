import type {
  CloudDevice,
  CloudStatus,
  CloudSyncResult,
  DevicePresence,
  PresenceStatus,
  DeviceVitals,
  SyncConflict,
  SyncDelta,
  SyncDomain,
  BackupSnapshot,
  BackupDomain,
  HandoffContext,
  HandoffKind,
  SecurityEvent,
  NetworkKind,
} from '../types';
import {
  registerCloudDevice,
  pairDevice,
  verifyDevice,
  renameDevice,
  disableDevice,
  enableDevice,
  removeCloudDevice,
  cloudHeartbeat,
  getCloudDevices,
  getCloudDevice,
  getDeviceHealth,
  type RegisterCloudDeviceInput,
} from '../device-manager';
import {
  pushDelta,
  pullDeltas,
  runCloudSync,
  getDeltaLog,
  getSyncQueueLength,
  getCloudLastSyncAt,
  type PushDeltaInput,
} from '../sync-engine';
import {
  enqueueCloudMutation,
  getCloudQueue,
  getCloudQueueLength,
  type EnqueueCloudInput,
} from '../offline-queue';
import { getConflicts, resolveManual, getConflictQueueLength } from '../conflict-resolver';
import { reportPresence, getPresence, getAllPresence } from '../presence-engine';
import {
  reportVitals,
  getVitals,
  getFleetVitals,
  getFleetHealthAvg,
  type ReportVitalsInput,
} from '../device-intelligence';
import { routeNotification, getRoutedNotifications } from '../notification-router';
import {
  createHandoff,
  claimHandoff,
  getHandoffs,
  getPendingHandoffCount,
  type CreateHandoffInput,
} from '../handoff-engine';
import { createBackup, listBackups, getRestorePlan, getLatestBackup } from '../cloud-backup';
import {
  trustDevice,
  revokeDevice,
  revokeSession,
  remoteLogout,
  rotatePushToken,
  rotateEncryptionKey,
  createDeviceSession,
  getActiveSessions,
  getSecurityEvents,
} from '../cloud-security';
import type { PushInput } from '@/lib/mobile/notification-center';
import { buildWearableView } from '@/lib/mobile/wearable-provider';

/**
 * Cloud Service — framework-bağımsız facade. Mac/Windows/iPhone/iPad/Watch/
 * Android/Web aynı düz JSON sözleşmesini kullanır. Katman ORKESTRASYON:
 * mevcut Mobile/Memory/KG/Notification servislerini aggregate eder.
 */

// ─── Devices ─────────────────────────────────────────────────────────────────

export function cloudRegisterDevice(input: RegisterCloudDeviceInput): CloudDevice {
  return registerCloudDevice(input);
}

export function cloudPairDevice(deviceId: string) {
  return pairDevice(deviceId);
}

export function cloudVerifyDevice(code: string): CloudDevice | null {
  return verifyDevice(code);
}

export function cloudRenameDevice(deviceId: string, name: string): CloudDevice | null {
  return renameDevice(deviceId, name);
}

export function cloudDisableDevice(deviceId: string): CloudDevice | null {
  return disableDevice(deviceId);
}

export function cloudEnableDevice(deviceId: string): CloudDevice | null {
  return enableDevice(deviceId);
}

export function cloudRemoveDevice(deviceId: string): boolean {
  return removeCloudDevice(deviceId);
}

export function cloudDevices(state?: CloudDevice['state']): CloudDevice[] {
  return getCloudDevices(state);
}

export function cloudDeviceHealth(deviceId: string) {
  return getDeviceHealth(deviceId);
}

export function cloudDeviceHeartbeat(
  deviceId: string,
  update?: { battery?: number; network?: NetworkKind },
) {
  return cloudHeartbeat(deviceId, update);
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export function cloudPushDelta(input: PushDeltaInput) {
  return pushDelta(input);
}

export function cloudPullDeltas(deviceId: string, domains?: SyncDomain[]) {
  return pullDeltas(deviceId, domains);
}

export function cloudSync(deviceId: string): CloudSyncResult {
  return runCloudSync(deviceId);
}

export function cloudDeltaLog(limit?: number, domain?: SyncDomain): SyncDelta[] {
  return getDeltaLog(limit, domain);
}

export function cloudEnqueueOffline(input: EnqueueCloudInput) {
  return enqueueCloudMutation(input);
}

export function cloudOfflineQueue() {
  return getCloudQueue();
}

// ─── Conflicts ───────────────────────────────────────────────────────────────

export function cloudConflicts(status?: SyncConflict['status'], limit?: number): SyncConflict[] {
  return getConflicts(status, limit);
}

export function cloudResolveConflict(
  conflictId: string,
  choice: 'local' | 'remote',
): SyncConflict | null {
  return resolveManual(conflictId, choice);
}

// ─── Presence ────────────────────────────────────────────────────────────────

export function cloudReportPresence(deviceId: string, status: PresenceStatus): DevicePresence {
  return reportPresence(deviceId, status);
}

export function cloudPresence(deviceId?: string): DevicePresence | DevicePresence[] {
  return deviceId ? getPresence(deviceId) : getAllPresence();
}

// ─── Device Intelligence ─────────────────────────────────────────────────────

export function cloudReportVitals(input: ReportVitalsInput): DeviceVitals {
  return reportVitals(input);
}

export function cloudVitals(deviceId?: string): DeviceVitals | DeviceVitals[] | null {
  return deviceId ? getVitals(deviceId) : getFleetVitals();
}

// ─── Notification Routing ────────────────────────────────────────────────────

export function cloudRouteNotification(input: PushInput) {
  return routeNotification(input);
}

export function cloudRoutedHistory(limit?: number) {
  return getRoutedNotifications(limit);
}

// ─── Handoff ─────────────────────────────────────────────────────────────────

export function cloudCreateHandoff(input: CreateHandoffInput): HandoffContext {
  return createHandoff(input);
}

export function cloudClaimHandoff(deviceId: string, kind?: HandoffKind): HandoffContext | null {
  return claimHandoff(deviceId, kind);
}

export function cloudHandoffs(state?: HandoffContext['state'], limit?: number): HandoffContext[] {
  return getHandoffs(state, limit);
}

// ─── Backup ──────────────────────────────────────────────────────────────────

export function cloudCreateBackup(deviceId: string, domains?: BackupDomain[]): BackupSnapshot {
  return createBackup(deviceId, domains);
}

export function cloudBackups(limit?: number): BackupSnapshot[] {
  return listBackups(limit);
}

export function cloudRestorePlan(version: number) {
  return getRestorePlan(version);
}

// ─── Security ────────────────────────────────────────────────────────────────

export function cloudTrustDevice(deviceId: string): CloudDevice | null {
  const device = getCloudDevice(deviceId);
  return device ? trustDevice(device) : null;
}

export function cloudRevokeDevice(deviceId: string): CloudDevice | null {
  const device = getCloudDevice(deviceId);
  return device ? revokeDevice(device) : null;
}

export function cloudCreateSession(deviceId: string) {
  return createDeviceSession(deviceId);
}

export function cloudRevokeSession(sessionId: string): boolean {
  return revokeSession(sessionId);
}

export function cloudRemoteLogout(deviceId: string): number {
  return remoteLogout(deviceId);
}

export function cloudRotatePushToken(deviceId: string, newToken: string): CloudDevice | null {
  const device = getCloudDevice(deviceId);
  return device ? rotatePushToken(device, newToken) : null;
}

export function cloudRotateEncryptionKey(deviceId: string): CloudDevice | null {
  const device = getCloudDevice(deviceId);
  return device ? rotateEncryptionKey(device) : null;
}

export function cloudSessions(deviceId?: string) {
  return getActiveSessions(deviceId);
}

export function cloudSecurityEvents(limit?: number, deviceId?: string): SecurityEvent[] {
  return getSecurityEvents(limit, deviceId);
}

// ─── Status / History (dashboard + mobil ekranlar) ──────────────────────────

export function cloudStatus(): CloudStatus {
  const devices = getCloudDevices();
  const presence = getAllPresence();
  const latestBackup = getLatestBackup();

  return {
    connectedDevices: presence.filter((p) => p.status !== 'offline').length,
    totalDevices: devices.length,
    trustedDevices: devices.filter((d) => d.trusted).length,
    presence: devices.map((d) => ({
      deviceId: d.id,
      name: d.name,
      type: d.type,
      status: presence.find((p) => p.deviceId === d.id)?.status ?? 'offline',
    })),
    syncQueueLength: getSyncQueueLength(),
    offlineQueueLength: getCloudQueueLength(),
    conflictQueueLength: getConflictQueueLength(),
    lastSyncAt: getCloudLastSyncAt(),
    lastBackup: latestBackup
      ? { version: latestBackup.version, createdAt: latestBackup.createdAt }
      : null,
    fleetHealthAvg: getFleetHealthAvg(),
    pendingHandoffs: getPendingHandoffCount(),
    generatedAt: new Date().toISOString(),
  };
}

/** Sync + backup + security birleşik geçmiş — /api/cloud/history. */
export function cloudHistory(limit = 30): {
  sync: SyncDelta[];
  backups: BackupSnapshot[];
  security: SecurityEvent[];
} {
  return {
    sync: getDeltaLog(limit),
    backups: listBackups(limit),
    security: getSecurityEvents(limit),
  };
}

/** Apple Watch cloud görünümü — mevcut wearable view + cloud durumu. */
export async function cloudWatchView(): Promise<{
  connected: boolean;
  connectedDevices: number;
  lastSyncAt: string | null;
  approvals: number;
  trading: { equity: number; todayPnl: number };
  executive: { focus: string; riskScore: number };
  generatedAt: string;
}> {
  const wearable = await buildWearableView(); // Sprint 18 reuse
  const status = cloudStatus();
  return {
    connected: status.connectedDevices > 0,
    connectedDevices: status.connectedDevices,
    lastSyncAt: status.lastSyncAt,
    approvals: wearable.approvals,
    trading: wearable.trading,
    executive: wearable.executive,
    generatedAt: new Date().toISOString(),
  };
}
