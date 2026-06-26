import type { HealthCheck, SystemHealth, ResourceMetrics, HealthAlert, HeartbeatConfig } from './types';

export interface HealthMonitor {
  registerCheck(name: string, checker: HealthChecker, interval?: number): void;
  unregisterCheck(name: string): void;
  check(): Promise<SystemHealth>;
  checkOne(name: string): Promise<HealthCheck>;
  getScore(): number;
  getAlerts(): HealthAlert[];
  acknowledgeAlert(alertId: string): void;
  getMetrics(): Promise<ResourceMetrics>;
  start(): void;
  stop(): void;
}

export interface HealthChecker {
  check(): Promise<Omit<HealthCheck, 'name' | 'lastCheckedAt'>>;
}

export interface HeartbeatManager {
  register(serviceId: string, config: HeartbeatConfig): void;
  pulse(serviceId: string): void;
  getMissed(): string[];
  isAlive(serviceId: string): boolean;
}
