import type { MarketplaceListing, PluginReview, PluginManifest, PluginCategory } from './types';
import { pluginExists } from './plugin-registry';
import { installPlugin, uninstallPlugin, updatePluginVersion } from './plugin-lifecycle';

// Marketplace — Install/Remove/Update/Rating/Reviews/Downloads/Categories/Search.
// Official plugin kataloğu gerçek manifest'lerle (WooCommerce/Discord/Stripe...).

function officialManifest(
  id: string,
  name: string,
  category: PluginCategory,
  permissions: PluginManifest['permissions'],
  actions: string[],
  icon: string,
): PluginManifest {
  return {
    id,
    name,
    version: '1.0.0',
    author: 'APEX Official',
    permissions,
    actions,
    hooks: [],
    settings: {},
    icon,
    category,
    description: `${name} entegrasyonu`,
  };
}

// Gerçek official plugin kataloğu (spec listesi)
const OFFICIAL_CATALOG: {
  manifest: PluginManifest;
  downloads: number;
  rating: number;
  reviewCount: number;
}[] = [
  {
    manifest: officialManifest(
      'woocommerce',
      'WooCommerce',
      'ecommerce',
      ['commerce', 'network'],
      ['product.sync', 'order.import'],
      '🛒',
    ),
    downloads: 15200,
    rating: 4.7,
    reviewCount: 340,
  },
  {
    manifest: officialManifest(
      'discord',
      'Discord',
      'communication',
      ['notifications', 'network'],
      ['message.send'],
      '💬',
    ),
    downloads: 22100,
    rating: 4.8,
    reviewCount: 512,
  },
  {
    manifest: officialManifest(
      'telegram',
      'Telegram',
      'communication',
      ['notifications', 'network'],
      ['message.send'],
      '✈️',
    ),
    downloads: 18700,
    rating: 4.6,
    reviewCount: 410,
  },
  {
    manifest: officialManifest(
      'whatsapp',
      'WhatsApp',
      'communication',
      ['notifications', 'network'],
      ['message.send'],
      '📱',
    ),
    downloads: 30400,
    rating: 4.5,
    reviewCount: 620,
  },
  {
    manifest: officialManifest(
      'stripe',
      'Stripe',
      'payment',
      ['commerce', 'network'],
      ['payment.charge', 'payout.list'],
      '💳',
    ),
    downloads: 41000,
    rating: 4.9,
    reviewCount: 890,
  },
  {
    manifest: officialManifest(
      'paytr',
      'PayTR',
      'payment',
      ['commerce', 'network'],
      ['payment.charge'],
      '🏦',
    ),
    downloads: 9800,
    rating: 4.4,
    reviewCount: 180,
  },
  {
    manifest: officialManifest(
      'google-drive',
      'Google Drive',
      'storage',
      ['filesystem', 'network'],
      ['file.upload', 'file.list'],
      '📁',
    ),
    downloads: 27300,
    rating: 4.7,
    reviewCount: 505,
  },
  {
    manifest: officialManifest(
      'dropbox',
      'Dropbox',
      'storage',
      ['filesystem', 'network'],
      ['file.upload'],
      '📦',
    ),
    downloads: 14600,
    rating: 4.5,
    reviewCount: 290,
  },
  {
    manifest: officialManifest('figma', 'Figma', 'design', ['network'], ['design.import'], '🎨'),
    downloads: 19200,
    rating: 4.8,
    reviewCount: 430,
  },
  {
    manifest: officialManifest(
      'trello',
      'Trello',
      'productivity',
      ['workflow', 'network'],
      ['card.create'],
      '📋',
    ),
    downloads: 16800,
    rating: 4.6,
    reviewCount: 355,
  },
  {
    manifest: officialManifest(
      'jira',
      'Jira',
      'productivity',
      ['workflow', 'network'],
      ['issue.create'],
      '🔷',
    ),
    downloads: 21500,
    rating: 4.4,
    reviewCount: 480,
  },
  {
    manifest: officialManifest(
      'obsidian',
      'Obsidian',
      'productivity',
      ['filesystem'],
      ['note.sync'],
      '🔮',
    ),
    downloads: 12300,
    rating: 4.9,
    reviewCount: 260,
  },
];

const g = globalThis as unknown as { __apexReviews?: Map<string, PluginReview[]> };
function reviews(): Map<string, PluginReview[]> {
  if (!g.__apexReviews) g.__apexReviews = new Map();
  return g.__apexReviews;
}

export function getMarketplaceListings(
  category?: PluginCategory,
  search?: string,
): MarketplaceListing[] {
  let items = OFFICIAL_CATALOG.map((c) => ({
    manifest: c.manifest,
    downloads: c.downloads,
    rating: c.rating,
    reviewCount: c.reviewCount + (reviews().get(c.manifest.id)?.length ?? 0),
    official: true,
    installed: pluginExists(c.manifest.id),
  }));
  if (category) items = items.filter((i) => i.manifest.category === category);
  if (search) {
    const kw = search.toLocaleLowerCase('tr');
    items = items.filter(
      (i) =>
        i.manifest.name.toLocaleLowerCase('tr').includes(kw) || i.manifest.category.includes(kw),
    );
  }
  return items.sort((a, b) => b.downloads - a.downloads);
}

export function getListing(id: string): MarketplaceListing | null {
  return getMarketplaceListings().find((l) => l.manifest.id === id) ?? null;
}

export function marketplaceInstall(id: string, grantAll = false) {
  const listing = getListing(id);
  if (!listing) return { ok: false, errors: ["Marketplace'te bulunamadı"] };
  return installPlugin(listing.manifest, grantAll);
}

export function marketplaceRemove(id: string): boolean {
  return uninstallPlugin(id);
}

export function marketplaceUpdate(id: string) {
  const listing = getListing(id);
  if (!listing) return { ok: false, errors: ["Marketplace'te bulunamadı"] };
  return updatePluginVersion(id, listing.manifest);
}

export function addReview(review: Omit<PluginReview, 'createdAt'>): PluginReview {
  const full: PluginReview = { ...review, createdAt: new Date().toISOString() };
  const r = reviews();
  const list = r.get(review.pluginId) ?? [];
  list.push(full);
  r.set(review.pluginId, list);
  return full;
}

export function getReviews(pluginId: string): PluginReview[] {
  return reviews().get(pluginId) ?? [];
}

export function getMarketplaceCount(): number {
  return OFFICIAL_CATALOG.length;
}
