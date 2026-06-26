import type { TriggerType, ScheduleConfig } from '../types';

export interface TriggerDefinition {
  type: TriggerType;
  name: string;
  description: string;
  configSchema: TriggerConfigField[];
}

export interface TriggerConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'cron';
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

const TRIGGER_DEFINITIONS: TriggerDefinition[] = [
  { type: 'manual', name: 'Manuel', description: 'Kullanıcı tarafından çalıştırılır', configSchema: [] },
  { type: 'schedule', name: 'Zamanlayıcı', description: 'Cron ifadesi ile zamanlanan', configSchema: [
    { name: 'cron', type: 'cron', required: true, description: 'Cron ifadesi' },
    { name: 'timezone', type: 'string', required: false, description: 'Saat dilimi', defaultValue: 'Europe/Istanbul' },
  ]},
  { type: 'desktop', name: 'Masaüstü Olayı', description: 'Uygulama değişikliği veya boşta kalma', configSchema: [
    { name: 'event', type: 'string', required: true, description: 'Olay türü (app_switch, idle, focus)' },
  ]},
  { type: 'webhook', name: 'Webhook', description: 'HTTP webhook ile tetiklenen', configSchema: [
    { name: 'path', type: 'string', required: true, description: 'Webhook yolu' },
  ]},
  { type: 'email', name: 'E-posta', description: 'Yeni e-posta geldiğinde', configSchema: [
    { name: 'filter', type: 'string', required: false, description: 'E-posta filtresi' },
  ]},
  { type: 'calendar', name: 'Takvim', description: 'Takvim olayı öncesi/sonrası', configSchema: [
    { name: 'minutesBefore', type: 'number', required: false, description: 'Kaç dakika önce', defaultValue: 15 },
  ]},
  { type: 'ai', name: 'AI Önerisi', description: 'AI Executive tarafından önerilen', configSchema: [] },
  { type: 'api', name: 'API Çağrısı', description: 'API endpoint üzerinden tetiklenen', configSchema: [] },
  { type: 'integration', name: 'Entegrasyon', description: 'Harici servis olayı', configSchema: [
    { name: 'provider', type: 'string', required: true, description: 'Sağlayıcı adı' },
    { name: 'event', type: 'string', required: true, description: 'Olay türü' },
  ]},
  { type: 'startup', name: 'Sistem Başlangıcı', description: 'Sistem başlatıldığında çalışır', configSchema: [] },
  { type: 'file', name: 'Dosya Oluşturma', description: 'Dosya oluşturulduğunda', configSchema: [
    { name: 'path', type: 'string', required: true, description: 'İzlenecek dizin' },
  ]},
  { type: 'browser', name: 'Tarayıcı Olayı', description: 'Tarayıcı etkinliği', configSchema: [
    { name: 'event', type: 'string', required: true, description: 'Olay türü (tab_open, navigate)' },
  ]},
];

export class TriggerRegistry {
  private definitions = new Map<TriggerType, TriggerDefinition>();

  constructor() {
    for (const def of TRIGGER_DEFINITIONS) {
      this.definitions.set(def.type, def);
    }
  }

  get(type: TriggerType): TriggerDefinition | undefined {
    return this.definitions.get(type);
  }

  list(): TriggerDefinition[] {
    return [...this.definitions.values()];
  }

  getConfigSchema(type: TriggerType): TriggerConfigField[] {
    return this.definitions.get(type)?.configSchema ?? [];
  }
}

export function parseCronNextRun(cron: string, _timezone: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return new Date(Date.now() + 60000).toISOString();

  const [minute, hour] = parts as [string, string, string, string, string];
  const now = new Date();
  const next = new Date(now);

  if (minute !== '*') next.setMinutes(parseInt(minute, 10));
  if (hour !== '*') next.setHours(parseInt(hour, 10));

  next.setSeconds(0);
  next.setMilliseconds(0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.toISOString();
}

export function shouldRunInBusinessHours(config: ScheduleConfig): boolean {
  const now = new Date();
  const hour = now.getHours();
  if (config.businessHoursOnly && (hour < 9 || hour >= 18)) return false;
  if (config.excludeWeekends) {
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
  }
  return true;
}
