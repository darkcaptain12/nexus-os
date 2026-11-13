import type { ExchangeAdapter } from './types';
import type { ExchangeName } from '../types';
import { binanceAdapter } from './binance';
import { mexcAdapter } from './mexc';
import { bybitAdapter } from './bybit';
import { okxAdapter } from './okx';

// Yeni borsa eklemek: adapter yaz → registerExchange ile kaydet. Çekirdek değişmez.
const g = globalThis as unknown as { __apexExchangeRegistry?: Map<string, ExchangeAdapter> };

function registry(): Map<string, ExchangeAdapter> {
  if (!g.__apexExchangeRegistry) {
    g.__apexExchangeRegistry = new Map();
    g.__apexExchangeRegistry.set('binance', binanceAdapter);
    g.__apexExchangeRegistry.set('mexc', mexcAdapter);
    g.__apexExchangeRegistry.set('bybit', bybitAdapter);
    g.__apexExchangeRegistry.set('okx', okxAdapter);
  }
  return g.__apexExchangeRegistry;
}

export function getExchange(name: ExchangeName | string): ExchangeAdapter {
  const adapter = registry().get(name);
  if (!adapter) {
    throw new Error(`Bilinmeyen borsa: ${name}. Kayıtlı: ${[...registry().keys()].join(', ')}`);
  }
  return adapter;
}

export function registerExchange(adapter: ExchangeAdapter): void {
  registry().set(adapter.name, adapter);
}

export function listExchanges(): string[] {
  return [...registry().keys()];
}
