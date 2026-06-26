import type { BaseEntity } from './base';

export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled' | 'pending';

export interface Trade extends BaseEntity {
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  pnl?: number;
  pnl_percentage?: number;
  opened_at: string;
  closed_at?: string;
  notes?: string;
  strategy?: string;
}
