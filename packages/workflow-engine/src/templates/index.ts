import type { WorkflowTemplate } from '../types';

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'morning-briefing',
    name: 'Sabah Brifingi',
    description: 'Her sabah günlük brifing oluşturur',
    category: 'productivity',
    workflow: {
      name: 'Sabah Brifingi',
      description: 'Günlük brifing oluşturur ve bildirim gönderir',
      status: 'draft',
      trigger: { type: 'schedule', config: { cron: '0 8 * * 1-5', timezone: 'Europe/Istanbul' } },
      nodes: [
        { id: 'n1', type: 'action', name: 'Brifing Oluştur', handler: 'ai.briefing', config: {}, position: { x: 0, y: 0 }, timeout: 10000, retries: 1 },
        { id: 'n2', type: 'notification', name: 'Bildirim Gönder', handler: 'notify.push', config: { title: 'Sabah Brifingi' }, position: { x: 0, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      entryNodeId: 'n1',
      variables: {},
      timeout: 30000,
      maxRetries: 2,
      tags: ['daily', 'briefing'],
    },
  },
  {
    id: 'eod-summary',
    name: 'Gün Sonu Özeti',
    description: 'Günlük aktivite özeti oluşturur',
    category: 'productivity',
    workflow: {
      name: 'Gün Sonu Özeti',
      description: 'Günlük verimlilik raporu',
      status: 'draft',
      trigger: { type: 'schedule', config: { cron: '0 18 * * 1-5', timezone: 'Europe/Istanbul' } },
      nodes: [
        { id: 'n1', type: 'action', name: 'Günlük Oluştur', handler: 'memory.journal', config: {}, position: { x: 0, y: 0 }, timeout: 10000, retries: 1 },
        { id: 'n2', type: 'action', name: 'Özet Kaydet', handler: 'memory.save', config: { type: 'journal' }, position: { x: 0, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      entryNodeId: 'n1',
      variables: {},
      timeout: 30000,
      maxRetries: 2,
      tags: ['daily', 'summary'],
    },
  },
  {
    id: 'github-daily',
    name: 'GitHub Günlük Kontrol',
    description: 'GitHub repo durumunu kontrol eder',
    category: 'development',
    workflow: {
      name: 'GitHub Günlük Kontrol',
      description: 'Açık issue ve PR sayısını kontrol eder',
      status: 'draft',
      trigger: { type: 'schedule', config: { cron: '0 9 * * 1-5', timezone: 'Europe/Istanbul' } },
      nodes: [
        { id: 'n1', type: 'action', name: 'Issue Kontrol', handler: 'github.getIssues', config: { owner: '', repo: '' }, position: { x: 0, y: 0 }, timeout: 10000, retries: 2 },
        { id: 'n2', type: 'action', name: 'PR Kontrol', handler: 'github.getPulls', config: { owner: '', repo: '' }, position: { x: 200, y: 0 }, timeout: 10000, retries: 2 },
      ],
      edges: [],
      entryNodeId: 'n1',
      variables: {},
      timeout: 30000,
      maxRetries: 2,
      tags: ['github', 'daily'],
    },
  },
  {
    id: 'gmail-summary',
    name: 'Gmail Gelen Kutusu Özeti',
    description: 'Okunmamış e-postaları özetler',
    category: 'communication',
    workflow: {
      name: 'Gmail Gelen Kutusu Özeti',
      description: 'Gelen kutusu durumunu kontrol eder',
      status: 'draft',
      trigger: { type: 'schedule', config: { cron: '0 9,14 * * 1-5', timezone: 'Europe/Istanbul' } },
      nodes: [
        { id: 'n1', type: 'action', name: 'E-posta Listele', handler: 'gmail.listMessages', config: { maxResults: 10 }, position: { x: 0, y: 0 }, timeout: 10000, retries: 2 },
      ],
      edges: [],
      entryNodeId: 'n1',
      variables: {},
      timeout: 15000,
      maxRetries: 1,
      tags: ['gmail', 'inbox'],
    },
  },
  {
    id: 'weekly-report',
    name: 'Haftalık Verimlilik Raporu',
    description: 'Haftalık performans özeti',
    category: 'productivity',
    workflow: {
      name: 'Haftalık Verimlilik Raporu',
      description: 'Haftalık verimlilik istatistikleri',
      status: 'draft',
      trigger: { type: 'schedule', config: { cron: '0 17 * * 5', timezone: 'Europe/Istanbul' } },
      nodes: [
        { id: 'n1', type: 'action', name: 'Rapor Oluştur', handler: 'memory.weeklySummary', config: {}, position: { x: 0, y: 0 }, timeout: 15000, retries: 1 },
        { id: 'n2', type: 'notification', name: 'Bildir', handler: 'notify.push', config: { title: 'Haftalık Rapor' }, position: { x: 0, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      entryNodeId: 'n1',
      variables: {},
      timeout: 30000,
      maxRetries: 1,
      tags: ['weekly', 'report'],
    },
  },
  {
    id: 'calendar-reminder',
    name: 'Takvim Hatırlatıcı',
    description: 'Etkinliklerden önce hatırlatma',
    category: 'calendar',
    workflow: {
      name: 'Takvim Hatırlatıcı',
      description: 'Yaklaşan etkinlikleri hatırlatır',
      status: 'draft',
      trigger: { type: 'calendar', config: { minutesBefore: 15 } },
      nodes: [
        { id: 'n1', type: 'action', name: 'Etkinlik Kontrol', handler: 'calendar.listEvents', config: { maxResults: 5 }, position: { x: 0, y: 0 }, timeout: 10000, retries: 1 },
        { id: 'n2', type: 'notification', name: 'Hatırlat', handler: 'notify.desktop', config: {}, position: { x: 0, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
      entryNodeId: 'n1',
      variables: {},
      timeout: 20000,
      maxRetries: 1,
      tags: ['calendar', 'reminder'],
    },
  },
  {
    id: 'idle-notification',
    name: 'Boşta Kalma Bildirimi',
    description: 'Uzun süre boşta kalınca hatırlatma',
    category: 'productivity',
    workflow: {
      name: 'Boşta Kalma Bildirimi',
      description: '30 dakika boşta kalınca bildirim',
      status: 'draft',
      trigger: { type: 'desktop', config: { event: 'idle', thresholdMinutes: 30 } },
      nodes: [
        { id: 'n1', type: 'notification', name: 'Hatırlat', handler: 'notify.desktop', config: { title: 'Uzun süredir boştasınız', body: 'Bir görevle devam etmek ister misiniz?' }, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 },
      ],
      edges: [],
      entryNodeId: 'n1',
      variables: {},
      timeout: 10000,
      maxRetries: 1,
      tags: ['desktop', 'idle'],
    },
  },
];

export function getTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

export function listTemplates(category?: string): WorkflowTemplate[] {
  if (category) return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
  return WORKFLOW_TEMPLATES;
}
