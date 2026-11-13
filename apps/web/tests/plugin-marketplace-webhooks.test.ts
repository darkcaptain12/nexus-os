import { describe, it, expect } from 'vitest';
import {
  getMarketplaceListings,
  marketplaceInstall,
  marketplaceRemove,
  addReview,
  getReviews,
  getMarketplaceCount,
} from '../src/lib/plugins/marketplace';
import {
  registerWebhook,
  receiveIncomingWebhook,
  signPayload,
  verifySignature,
  retryFailedDeliveries,
  getWebhooks,
} from '../src/lib/plugins/webhooks';
import {
  registerOAuthApp,
  getOAuthApp,
  generatePkceChallenge,
  buildPluginAuthorizeUrl,
} from '../src/lib/plugins/plugin-oauth';

describe('Marketplace — official plugins', () => {
  it('12 official plugin kataloğu', () => {
    expect(getMarketplaceCount()).toBe(12);
    const listings = getMarketplaceListings();
    expect(listings.some((l) => l.manifest.id === 'stripe')).toBe(true);
    expect(listings.some((l) => l.manifest.id === 'woocommerce')).toBe(true);
  });

  it("downloads'a göre sıralı", () => {
    const l = getMarketplaceListings();
    for (let i = 1; i < l.length; i++)
      expect(l[i - 1]!.downloads).toBeGreaterThanOrEqual(l[i]!.downloads);
  });

  it('kategori filtresi', () => {
    const payment = getMarketplaceListings('payment');
    expect(payment.every((l) => l.manifest.category === 'payment')).toBe(true);
    expect(payment.length).toBeGreaterThanOrEqual(2); // stripe + paytr
  });

  it('arama çalışır', () => {
    const results = getMarketplaceListings(undefined, 'discord');
    expect(results.some((l) => l.manifest.id === 'discord')).toBe(true);
  });

  it('marketplace install → kurulu + installed flag', () => {
    const r = marketplaceInstall('figma', true);
    expect(r.ok).toBe(true);
    expect(getMarketplaceListings().find((l) => l.manifest.id === 'figma')!.installed).toBe(true);
    marketplaceRemove('figma');
  });

  it('review ekle + oku', () => {
    addReview({ pluginId: 'stripe', author: 'Emir', rating: 5, comment: 'harika' });
    expect(getReviews('stripe').length).toBeGreaterThan(0);
  });
});

describe('Webhooks — signature + replay protection', () => {
  it('imza üret + doğrula', () => {
    const sig = signPayload('secret123', '{"a":1}');
    expect(verifySignature('secret123', '{"a":1}', sig)).toBe(true);
    expect(verifySignature('wrong', '{"a":1}', sig)).toBe(false);
  });

  it('incoming webhook geçerli imza kabul eder', () => {
    const wh = registerWebhook({
      pluginId: 'test-wh',
      direction: 'incoming',
      url: 'https://x.com/hook',
      event: 'trade.opened',
      secret: 'sec12345',
    });
    const payload = '{"symbol":"BTC"}';
    const sig = signPayload('sec12345', payload);
    const r = receiveIncomingWebhook(wh.id, payload, sig);
    expect(r.accepted).toBe(true);
  });

  it('replay tespit + engelle', () => {
    const wh = registerWebhook({
      pluginId: 'test-wh2',
      direction: 'incoming',
      url: 'https://x.com/h',
      event: 'order.created',
      secret: 'sec99999',
    });
    const payload = '{"order":1}';
    const sig = signPayload('sec99999', payload);
    receiveIncomingWebhook(wh.id, payload, sig); // ilk
    const replay = receiveIncomingWebhook(wh.id, payload, sig); // tekrar
    expect(replay.accepted).toBe(false);
    expect(replay.reason).toContain('Replay');
  });

  it('geçersiz imza reddedilir', () => {
    const wh = registerWebhook({
      pluginId: 'test-wh3',
      direction: 'incoming',
      url: 'https://x.com/z',
      event: 'voice.intent',
      secret: 'seckey12',
    });
    const r = receiveIncomingWebhook(wh.id, '{"x":1}', 'gecersiz-imza');
    expect(r.accepted).toBe(false);
    expect(r.reason).toContain('imza');
  });

  it('outgoing webhook kaydı + retry', () => {
    registerWebhook({
      pluginId: 'out-wh',
      direction: 'outgoing',
      url: 'https://x.com/out',
      event: 'trade.closed',
      secret: 'outsec12',
    });
    expect(getWebhooks().some((w) => w.direction === 'outgoing')).toBe(true);
    expect(typeof retryFailedDeliveries()).toBe('number');
  });
});

describe('Plugin OAuth — mevcut oauth reuse', () => {
  it('OAuth app kayıt + PKCE', () => {
    const app = registerOAuthApp({
      pluginId: 'oauth-plugin',
      redirectUri: 'https://app.com/cb',
      scopes: ['read'],
      pkceRequired: true,
      openIdEnabled: true,
    });
    expect(app.clientId).toContain('apex-plugin');
    expect(getOAuthApp('oauth-plugin')).not.toBeNull();
  });

  it('PKCE challenge üretilir', () => {
    const { challenge, method } = generatePkceChallenge('a'.repeat(50));
    expect(method).toBe('S256');
    expect(challenge.length).toBeGreaterThan(0);
  });

  it('authorize url PKCE + openid ekler', () => {
    registerOAuthApp({
      pluginId: 'oauth-plugin2',
      redirectUri: 'https://app.com/cb',
      scopes: [],
      pkceRequired: true,
      openIdEnabled: true,
    });
    const provider = {
      name: 'test',
      authorizeUrl: 'https://auth.com/authorize',
      tokenUrl: 'https://auth.com/token',
      clientId: 'x',
      clientSecret: 's',
      redirectUri: 'https://app.com/cb',
      scopes: [],
    } as Parameters<typeof buildPluginAuthorizeUrl>[1];
    const url = buildPluginAuthorizeUrl('oauth-plugin2', provider, 'state123', 'chal456');
    expect(url).toContain('code_challenge');
  });
});
