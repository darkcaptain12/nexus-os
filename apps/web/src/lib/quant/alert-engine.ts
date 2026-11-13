import type { QuantAlert, AlertCondition, Candle, Timeframe, ExchangeName } from './types';
import { rsi, lastDefined } from './indicators';

// Alert Engine — fiyat/RSI eşik alarmları. Değerlendirme gerçek mumlarla yapılır.

const MAX_ALERTS = 100;

export interface CreateAlertInput {
  symbol: string;
  exchange: ExchangeName;
  timeframe: Timeframe;
  condition: AlertCondition;
  threshold: number;
  message?: string;
}

export class AlertEngine {
  private alerts: QuantAlert[] = [];

  create(input: CreateAlertInput): QuantAlert {
    const alert: QuantAlert = {
      id: crypto.randomUUID(),
      symbol: input.symbol,
      exchange: input.exchange,
      timeframe: input.timeframe,
      condition: input.condition,
      threshold: input.threshold,
      status: 'active',
      message:
        input.message ?? `${input.symbol} ${input.condition.replace('_', ' ')} ${input.threshold}`,
      createdAt: new Date().toISOString(),
      triggeredAt: null,
      triggeredValue: null,
    };
    this.alerts.push(alert);
    if (this.alerts.length > MAX_ALERTS) this.alerts.shift();
    return alert;
  }

  cancel(id: string): QuantAlert | null {
    const alert = this.alerts.find((a) => a.id === id && a.status === 'active');
    if (!alert) return null;
    alert.status = 'cancelled';
    return alert;
  }

  getAll(): QuantAlert[] {
    return [...this.alerts].reverse();
  }

  getActive(): QuantAlert[] {
    return this.alerts.filter((a) => a.status === 'active');
  }

  /** Sembolün güncel mumlarıyla aktif alarmları değerlendir; tetiklenenleri döndür. */
  evaluate(symbol: string, candles: Candle[]): QuantAlert[] {
    const lastClose = candles[candles.length - 1]?.close;
    if (lastClose === undefined) return [];
    const lastRsi = lastDefined(
      rsi(
        candles.map((c) => c.close),
        14,
      ),
    );
    const triggered: QuantAlert[] = [];

    for (const alert of this.alerts) {
      if (alert.status !== 'active' || alert.symbol !== symbol) continue;

      let value: number | null = null;
      let hit = false;
      switch (alert.condition) {
        case 'price_above':
          value = lastClose;
          hit = lastClose >= alert.threshold;
          break;
        case 'price_below':
          value = lastClose;
          hit = lastClose <= alert.threshold;
          break;
        case 'rsi_above':
          value = lastRsi;
          hit = lastRsi !== null && lastRsi >= alert.threshold;
          break;
        case 'rsi_below':
          value = lastRsi;
          hit = lastRsi !== null && lastRsi <= alert.threshold;
          break;
      }

      if (hit) {
        alert.status = 'triggered';
        alert.triggeredAt = new Date().toISOString();
        alert.triggeredValue = value;
        triggered.push(alert);
      }
    }
    return triggered;
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexAlertEngine?: AlertEngine };

export function getAlertEngine(): AlertEngine {
  if (!g.__apexAlertEngine) g.__apexAlertEngine = new AlertEngine();
  return g.__apexAlertEngine;
}
