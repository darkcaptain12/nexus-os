import type {
  MobileHomeDashboard,
  MobileApprovalItem,
  MobileTradingView,
  DesktopCompanion,
  WidgetData,
  WidgetSize,
  WearableView,
  MobileSystemHealth,
  OfflineSnapshot,
  SyncResult,
  SyncConflictStrategy,
  DevicePlatform,
  PushCategory,
  SyncEntity,
} from '../types';
import {
  buildHomeDashboard,
  buildApprovalCenter,
  buildTradingView,
  buildDesktopCompanion,
} from '../mobile-runtime';
import { buildWidget } from '../widget-provider';
import { buildWearableView } from '../wearable-provider';
import { runBackgroundSync, getMobileSystemHealth } from '../background-service';
import {
  registerDevice,
  heartbeat,
  getDevices,
  type RegisterDeviceInput,
} from '../device-registry';
import { pushNotification, getNotifications, type PushInput } from '../notification-center';
import { getSnapshot, enqueueMutation } from '../offline-store';
import { syncOfflineQueue } from '../sync-client';
import { getCommerceOverview, type CommerceOverview } from '@/lib/commerce/commerce-service';
import { commerceDashboard } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';
import { liveTradingSummary } from '@/lib/quant/live/services/live-trading-service';
import { devMobileView } from '@/lib/plugins/services/developer-platform-service';
import {
  cloudDevices,
  cloudSync,
  cloudBackups,
  cloudStatus,
} from '@/lib/cloud/services/cloud-service';
import {
  mobileOptimizationView,
  watchOptimizationView,
  weeklyCeoReport,
  intelligenceScore,
  goalProgress,
} from '@/lib/executive/optimization/services/self-optimization-service';

/**
 * Mobile Service — framework-bağımsız facade. Tek kod tabanı: iPhone/iPad/
 * Android/Apple Watch/Wear OS aynı düz JSON sözleşmesini kullanır. Yeni iş
 * mantığı YOK — mevcut servisleri aggregate eder.
 */

// ─── Auth (Supabase reuse + biyometrik yetenek) ──────────────────────────────
// FaceID/TouchID/Passkey/Biometric ham işlemi istemci-tarafı (Secure Enclave).
// Server Supabase session'ı reuse eder; bu descriptor istemciye yetenekleri bildirir.
export function getAuthCapabilities(): {
  provider: 'supabase';
  biometric: ('faceid' | 'touchid' | 'passkey' | 'biometric-lock')[];
  sessionReuse: boolean;
} {
  return {
    provider: 'supabase',
    biometric: ['faceid', 'touchid', 'passkey', 'biometric-lock'],
    sessionReuse: true,
  };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export function mobileHome(): Promise<MobileHomeDashboard> {
  return buildHomeDashboard();
}

export function mobileApprovals(): MobileApprovalItem[] {
  return buildApprovalCenter();
}

export function mobileTrading(): Promise<MobileTradingView> {
  return buildTradingView();
}

export function mobileCommerce(): Promise<CommerceOverview> {
  return getCommerceOverview();
}

/** Mobil Commerce Intelligence — Revenue/Ads/Hunter/Supplier (Sprint 19 reuse). */
export function mobileCommerceIntelligence() {
  return commerceDashboard();
}

/** Mobil Live Trading — Portföy/PnL/Risk/Pozisyon özeti (Sprint 20 reuse). */
export function mobileLiveTrading() {
  return liveTradingSummary();
}

/** Mobil Plugin yönetimi — liste/kurulum/izinler (Sprint 21 reuse). */
export function mobilePlugins() {
  return devMobileView();
}

export function mobileDesktopCompanion(): DesktopCompanion {
  return buildDesktopCompanion();
}

// ─── Devices ─────────────────────────────────────────────────────────────────
export function mobileRegisterDevice(input: RegisterDeviceInput) {
  return registerDevice(input);
}

export function mobileHeartbeat(deviceId: string, battery?: number) {
  return heartbeat(deviceId, battery);
}

export function mobileDevices() {
  return getDevices();
}

// ─── Widgets ─────────────────────────────────────────────────────────────────
export function mobileWidget(size: WidgetSize, platform?: DevicePlatform): Promise<WidgetData> {
  return buildWidget(size, platform);
}

// ─── Watch ───────────────────────────────────────────────────────────────────
export function mobileWatch(): Promise<WearableView> {
  return buildWearableView();
}

// ─── Notifications ───────────────────────────────────────────────────────────
export function mobilePush(input: PushInput) {
  return pushNotification(input);
}

export function mobileNotifications(limit?: number, category?: PushCategory) {
  return getNotifications(limit, category);
}

// ─── Offline & Sync ──────────────────────────────────────────────────────────
export function mobileOfflineSnapshot(): OfflineSnapshot | null {
  return getSnapshot();
}

export function mobileEnqueueMutation(input: {
  entity: SyncEntity;
  action: string;
  payload: Record<string, unknown>;
  deviceId: string;
}) {
  return enqueueMutation(input);
}

export function mobileSync(strategy?: SyncConflictStrategy): SyncResult {
  return syncOfflineQueue(strategy);
}

export function mobileBackgroundSync() {
  return runBackgroundSync();
}

// ─── System Health ───────────────────────────────────────────────────────────
export function mobileSystemHealth(): MobileSystemHealth {
  return getMobileSystemHealth();
}

// ─── Cloud (Sprint 22 reuse) ─────────────────────────────────────────────────
/** Mobil Devices ekranı — tüm cihaz filosu. */
export function mobileCloudDevices() {
  return cloudDevices();
}

/** Mobil Sync ekranı — sync döngüsü çalıştır + sonuç. */
export function mobileCloudSync(deviceId: string) {
  return cloudSync(deviceId);
}

/** Mobil Backup ekranı — version history. */
export function mobileCloudBackup() {
  return cloudBackups();
}

/** Mobil Cloud Status ekranı — bağlı cihaz/kuyruk/backup/presence özeti. */
export function mobileCloudStatus() {
  return cloudStatus();
}

// ─── Self-Optimization (Sprint 23 reuse) ─────────────────────────────────────
/** Mobil optimizasyon özeti — Intelligence Score/hedef/review (iPhone/Watch). */
export function mobileOptimization() {
  return mobileOptimizationView();
}

/** Mobil CEO Report ekranı — haftalık kazanç/kayıp/öneri. */
export function mobileCeoReport() {
  return weeklyCeoReport();
}

/** Mobil Intelligence Score + hedef ilerlemesi. */
export async function mobileIntelligence() {
  const [score, goals] = await Promise.all([intelligenceScore(), goalProgress()]);
  return { score, goals };
}

/** Apple Watch optimizasyon — günlük hedef/score/kâr/kritik öneri. */
export function mobileWatchOptimization() {
  return watchOptimizationView();
}
