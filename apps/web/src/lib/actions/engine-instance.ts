import { ActionEngine } from '@apex-os/action-engine';
import type { ActionDefinition } from '@apex-os/action-engine';
import {
  taskCreateHandler,
  taskCompleteHandler,
  taskUpdatePriorityHandler,
  taskDeleteHandler,
  projectArchiveHandler,
  notificationSendHandler,
  memorySaveHandler,
} from './handlers';
import {
  tradeAnalyzeHandler,
  tradeRiskCheckHandler,
  tradePaperOrderHandler,
} from '@/lib/quant/trading-actions';
import {
  productPublishHandler,
  adLaunchHandler,
  budgetIncreaseHandler,
} from '@/lib/commerce/intelligence/commerce-actions';
import { liveOrderHandler } from '@/lib/quant/live/live-actions';

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexActionEngine?: ActionEngine };

const ACTION_DEFS: {
  def: ActionDefinition;
  handler: Parameters<ActionEngine['registerAction']>[1];
}[] = [
  {
    def: {
      id: 'task.create',
      name: 'Görev Oluştur',
      description: 'Yeni görev oluşturur',
      category: 'notification',
      riskLevel: 'low',
      permissions: [],
      timeout: 10000,
      rollbackCapable: true,
      parameters: [{ name: 'title', type: 'string', required: true, description: 'Görev başlığı' }],
      metadata: {},
    },
    handler: taskCreateHandler,
  },
  {
    def: {
      id: 'task.complete',
      name: 'Görev Tamamla',
      description: 'Görevi tamamlandı olarak işaretler',
      category: 'notification',
      riskLevel: 'low',
      permissions: [],
      timeout: 5000,
      rollbackCapable: true,
      parameters: [{ name: 'taskId', type: 'string', required: true, description: 'Görev ID' }],
      metadata: {},
    },
    handler: taskCompleteHandler,
  },
  {
    def: {
      id: 'task.updatePriority',
      name: 'Öncelik Değiştir',
      description: 'Görev önceliğini değiştirir',
      category: 'notification',
      riskLevel: 'medium',
      permissions: [],
      timeout: 5000,
      rollbackCapable: false,
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Görev ID' },
        { name: 'priority', type: 'string', required: true, description: 'Yeni öncelik' },
      ],
      metadata: {},
    },
    handler: taskUpdatePriorityHandler,
  },
  {
    def: {
      id: 'task.delete',
      name: 'Görev Sil',
      description: 'Görevi siler (soft delete)',
      category: 'notification',
      riskLevel: 'high',
      permissions: [],
      timeout: 5000,
      rollbackCapable: false,
      parameters: [{ name: 'taskId', type: 'string', required: true, description: 'Görev ID' }],
      metadata: {},
    },
    handler: taskDeleteHandler,
  },
  {
    def: {
      id: 'project.archive',
      name: 'Proje Arşivle',
      description: 'Projeyi arşivler',
      category: 'notification',
      riskLevel: 'high',
      permissions: [],
      timeout: 5000,
      rollbackCapable: true,
      parameters: [{ name: 'projectId', type: 'string', required: true, description: 'Proje ID' }],
      metadata: {},
    },
    handler: projectArchiveHandler,
  },
  {
    def: {
      id: 'notification.send',
      name: 'Bildirim Gönder',
      description: 'In-app bildirim oluşturur',
      category: 'notification',
      riskLevel: 'low',
      permissions: [],
      timeout: 5000,
      rollbackCapable: false,
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Başlık' },
        { name: 'body', type: 'string', required: true, description: 'İçerik' },
      ],
      metadata: {},
    },
    handler: notificationSendHandler,
  },
  {
    def: {
      id: 'memory.save',
      name: 'Hafıza Kaydet',
      description: 'Memory kaydı oluşturur',
      category: 'notification',
      riskLevel: 'low',
      permissions: [],
      timeout: 5000,
      rollbackCapable: false,
      parameters: [{ name: 'content', type: 'string', required: true, description: 'İçerik' }],
      metadata: {},
    },
    handler: memorySaveHandler,
  },
  {
    def: {
      id: 'trade.analyze',
      name: 'Piyasa Analizi',
      description: 'Sembol için teknik + SMC analiz üretir',
      category: 'notification',
      riskLevel: 'low',
      permissions: [],
      timeout: 15000,
      rollbackCapable: false,
      parameters: [
        {
          name: 'symbol',
          type: 'string',
          required: true,
          description: 'İşlem çifti (örn. BTCUSDT)',
        },
      ],
      metadata: {},
    },
    handler: tradeAnalyzeHandler,
  },
  {
    def: {
      id: 'trade.riskCheck',
      name: 'Risk Kontrolü',
      description: 'Planlanan emir için risk limitlerini kontrol eder',
      category: 'notification',
      riskLevel: 'low',
      permissions: [],
      timeout: 15000,
      rollbackCapable: false,
      parameters: [{ name: 'symbol', type: 'string', required: true, description: 'İşlem çifti' }],
      metadata: {},
    },
    handler: tradeRiskCheckHandler,
  },
  {
    def: {
      id: 'trade.paperOrder',
      name: 'Paper Emir',
      description: 'Paper trading hesabına emir basar (gerçek para YOK)',
      category: 'notification',
      riskLevel: 'high',
      permissions: [],
      timeout: 15000,
      rollbackCapable: false,
      parameters: [
        { name: 'symbol', type: 'string', required: true, description: 'İşlem çifti' },
        { name: 'side', type: 'string', required: true, description: 'buy | sell' },
      ],
      metadata: {},
    },
    handler: tradePaperOrderHandler,
  },
  {
    def: {
      id: 'commerce.publishProduct',
      name: 'Ürün Yayınla',
      description: 'Ürünü mağazaya yayınlar (Shopify reuse) — gerçek yayın',
      category: 'notification',
      riskLevel: 'high',
      permissions: [],
      timeout: 20000,
      rollbackCapable: true,
      parameters: [
        { name: 'queueId', type: 'string', required: true, description: 'Kuyruk ürün ID' },
      ],
      metadata: {},
    },
    handler: productPublishHandler,
  },
  {
    def: {
      id: 'commerce.launchAd',
      name: 'Reklam Başlat',
      description: 'Reklam kampanyası başlatır (Meta/Google/TikTok) — gerçek para',
      category: 'notification',
      riskLevel: 'critical',
      permissions: [],
      timeout: 20000,
      rollbackCapable: false,
      parameters: [
        { name: 'queueId', type: 'string', required: true, description: 'Kuyruk ürün ID' },
        { name: 'platform', type: 'string', required: true, description: 'meta|google|tiktok' },
      ],
      metadata: {},
    },
    handler: adLaunchHandler,
  },
  {
    def: {
      id: 'commerce.increaseBudget',
      name: 'Bütçe Artır',
      description: 'Reklam bütçesini artırır — gerçek para harcama',
      category: 'notification',
      riskLevel: 'critical',
      permissions: [],
      timeout: 10000,
      rollbackCapable: true,
      parameters: [
        { name: 'campaignId', type: 'string', required: true, description: 'Kampanya ID' },
        { name: 'newBudget', type: 'number', required: true, description: 'Yeni günlük bütçe' },
      ],
      metadata: {},
    },
    handler: budgetIncreaseHandler,
  },
  {
    def: {
      id: 'trade.liveOrder',
      name: 'Canlı Emir',
      description: 'Gerçek borsaya emir gönderir — GERÇEK PARA, onay ZORUNLU',
      category: 'notification',
      riskLevel: 'critical',
      permissions: [],
      timeout: 20000,
      rollbackCapable: false,
      parameters: [
        { name: 'symbol', type: 'string', required: true, description: 'Sembol' },
        { name: 'side', type: 'string', required: true, description: 'buy|sell' },
        { name: 'quantity', type: 'number', required: true, description: 'Miktar' },
      ],
      metadata: {},
    },
    handler: liveOrderHandler,
  },
];

export function getActionEngine(): ActionEngine {
  if (!g.__apexActionEngine) {
    const engine = new ActionEngine(5);
    for (const { def, handler } of ACTION_DEFS) {
      engine.registerAction(def, handler);
    }
    g.__apexActionEngine = engine;
  }
  return g.__apexActionEngine;
}
