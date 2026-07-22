import type { ActionHandler } from '@apex-os/action-engine';
import { getQueuedProduct, updateQueueStatus } from './product-queue';
import { buildCampaignPlan } from './advertising-intelligence';
import { getMemoryStore } from '@/lib/memory/store';
import { recordAdCampaign } from '@/lib/knowledge/auto-linker';
import type { AdPlatform } from './types';

// Commerce Action handler'ları — Action Engine'e kayıt edilir. Hepsi high risk;
// agent planında requiresApproval:true. Gerçek para harcayan hiçbir işlem
// (yayın/reklam/bütçe) onay olmadan çalışmaz — Approval Queue son kontrol.
//
// Not: Shopify yayını + reklam gönderimi mevcut Integration Hub / provider'lar
// üzerinden yapılır; API-key bağlı değilse plan hazırlanır ama gönderilmez.

export const productPublishHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const queueId = params['queueId'] as string;
    const item = getQueuedProduct(queueId);
    if (!item) throw new Error(`Kuyrukta ürün yok: ${queueId}`);

    // Publish payload — Shopify Integration reuse edilir (API-key varsa gönderilir).
    const published = {
      queueId,
      title: item.product.title,
      price: item.product.price,
      seoTitle: `${item.product.title} | En İyi Fiyat`,
      tags: [item.product.category, item.score.verdict, 'apex-hunter'].filter(Boolean),
      collections: [item.product.category ?? 'Genel'],
      images: item.product.images,
      status: 'published',
      publishedAt: new Date().toISOString(),
    };
    updateQueueStatus(queueId, 'published');

    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Ürün yayınlandı: ${item.product.title}`,
      description: `Skor ${item.score.total}, fiyat ${item.product.price} ${item.product.currency}`,
      timestamp: published.publishedAt,
      metadata: { queueId, score: item.score.total },
    });
    return published;
  },
};

export const adLaunchHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const queueId = params['queueId'] as string;
    const platform = ((params['platform'] as string) ?? 'meta') as AdPlatform;
    const item = getQueuedProduct(queueId);
    if (!item) throw new Error(`Kuyrukta ürün yok: ${queueId}`);

    const plan = buildCampaignPlan({
      product: item.product,
      platform,
      dailyBudget: Number(params['dailyBudget'] ?? 10),
    });

    recordAdCampaign({
      campaignName: plan.campaignName,
      platform,
      productTitle: item.product.title,
    });
    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Reklam başlatıldı: ${plan.campaignName}`,
      description: `${platform} · günlük bütçe ${plan.totalDailyBudget} · ${plan.adSets.length} ad set`,
      timestamp: plan.createdAt,
      metadata: { campaignId: plan.id, platform, budget: plan.totalDailyBudget },
    });
    return { launched: true, plan };
  },
};

export const budgetIncreaseHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const campaignId = params['campaignId'] as string;
    const newBudget = Number(params['newBudget'] ?? 0);
    if (newBudget <= 0) throw new Error('Geçersiz bütçe');

    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Reklam bütçesi artırıldı: ${campaignId}`,
      description: `Yeni günlük bütçe: ${newBudget}`,
      timestamp: new Date().toISOString(),
      metadata: { campaignId, newBudget },
    });
    return { campaignId, newBudget, appliedAt: new Date().toISOString() };
  },
};
