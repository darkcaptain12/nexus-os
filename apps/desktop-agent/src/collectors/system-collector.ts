import os from 'os';
import type { SystemInfo } from '../types';

export function getSystemInfo(): SystemInfo {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    platform: os.platform() as SystemInfo['platform'],
    osVersion: os.release(),
    hostname: os.hostname(),
    cpu: {
      model: cpus[0]?.model ?? 'unknown',
      cores: cpus.length,
      usage: getCpuUsage(cpus),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      percentage: Math.round((usedMem / totalMem) * 100),
    },
    displays: 1,
    networkConnected: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    uptime: Math.round(os.uptime()),
  };
}

function getCpuUsage(cpus: os.CpuInfo[]): number {
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    totalIdle += cpu.times.idle;
    totalTick += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return Math.round((1 - totalIdle / totalTick) * 100);
}
