import type { DeviceVitals, NetworkKind } from './types';
import { getSyncLag, getSyncCursor } from './sync-engine';
import { getCloudDevice } from './device-manager';

// Device Intelligence — cihaz başına CPU/RAM/Storage/Network/Battery/Health/
// Sync Status. Health skoru gerçek formül (0-100). Event-driven: cihaz
// reportVitals gönderir, server poll yapmaz.

const g = globalThis as unknown as { __apexCloudVitals?: Map<string, DeviceVitals> };

function store(): Map<string, DeviceVitals> {
  if (!g.__apexCloudVitals) g.__apexCloudVitals = new Map();
  return g.__apexCloudVitals;
}

export interface ReportVitalsInput {
  deviceId: string;
  cpuPercent: number;
  ramPercent: number;
  storagePercent: number;
  network: NetworkKind;
  battery?: number;
}

/** Health skoru — 100'den ceza düşerek: CPU/RAM/Storage baskısı, batarya, ağ. */
export function computeHealthScore(input: {
  cpuPercent: number;
  ramPercent: number;
  storagePercent: number;
  network: NetworkKind;
  battery: number | null;
}): number {
  let score = 100;
  if (input.cpuPercent > 85) score -= 25;
  else if (input.cpuPercent > 70) score -= 10;
  if (input.ramPercent > 90) score -= 20;
  else if (input.ramPercent > 75) score -= 8;
  if (input.storagePercent > 90) score -= 20;
  else if (input.storagePercent > 80) score -= 8;
  if (input.network === 'offline') score -= 30;
  else if (input.network === 'cellular') score -= 5;
  if (input.battery !== null && input.battery < 15) score -= 15;
  else if (input.battery !== null && input.battery < 30) score -= 5;
  return Math.max(0, Math.min(100, score));
}

/** Vitals raporu — health skoru + sync durumu hesaplanır. */
export function reportVitals(input: ReportVitalsInput): DeviceVitals {
  const battery = input.battery ?? getCloudDevice(input.deviceId)?.battery ?? null;
  const cursor = getSyncCursor(input.deviceId);
  const lag = getSyncLag(input.deviceId);

  const vitals: DeviceVitals = {
    deviceId: input.deviceId,
    cpuPercent: input.cpuPercent,
    ramPercent: input.ramPercent,
    storagePercent: input.storagePercent,
    network: input.network,
    battery,
    healthScore: computeHealthScore({ ...input, battery }),
    syncStatus: cursor === null ? 'never' : lag > 0 ? 'behind' : 'synced',
    syncLag: lag,
    reportedAt: new Date().toISOString(),
  };
  store().set(input.deviceId, vitals);
  return vitals;
}

export function getVitals(deviceId: string): DeviceVitals | null {
  return store().get(deviceId) ?? null;
}

export function getFleetVitals(): DeviceVitals[] {
  return [...store().values()];
}

/** Filo sağlık ortalaması — dashboard. */
export function getFleetHealthAvg(): number {
  const all = getFleetVitals();
  if (all.length === 0) return 100;
  return Math.round(all.reduce((sum, v) => sum + v.healthScore, 0) / all.length);
}
