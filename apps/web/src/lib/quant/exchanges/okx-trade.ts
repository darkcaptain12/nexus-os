import { createHmac } from 'node:crypto';
import { toOkxInstId } from './okx';
import type { OrderSide } from '../types';

// OKX v5 PRIVATE (signed) trading API — GERÇEK emir gönderir.
// Yalnız kill-switch açık + Approval Queue onaylı emirler için çağrılır
// (live-actions handler). Withdraw endpoint'i YOK — bu modül sadece order verir.
//
// İmzalama: OK-ACCESS-SIGN = base64(HMAC-SHA256(secret, timestamp+method+path+body)).

const OKX_BASE = 'https://www.okx.com';
const ORDER_PATH = '/api/v5/trade/order';

interface OkxOrderResult {
  ordId: string;
  clOrdId: string;
  sCode: string;
  sMsg: string;
}

interface OkxOrderResponse {
  code: string;
  msg: string;
  data?: OkxOrderResult[];
}

function sign(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(timestamp + method + path + body)
    .digest('base64');
}

export interface OkxLiveOrderInput {
  symbol: string;
  side: OrderSide;
  quantity: number;
  ordType?: 'market' | 'limit';
  price?: number; // limit için
}

export interface OkxLiveOrderResult {
  exchangeOrderId: string;
  accepted: boolean;
  message: string;
}

/**
 * OKX'e GERÇEK spot emir gönderir. Credential yoksa/placeholder ise hata fırlatır
 * (asla sessizce mock'a düşmez). Çağıran (live-actions) kill-switch + Approval
 * kontrolünü önceden yapmış olmalıdır.
 */
export async function okxPlaceLiveOrder(input: OkxLiveOrderInput): Promise<OkxLiveOrderResult> {
  const key = process.env.OKX_API_KEY;
  const secret = process.env.OKX_API_SECRET;
  const passphrase = process.env.OKX_API_PASSPHRASE;

  if (!key || !secret || !passphrase) {
    throw new Error(
      'OKX API credentials (KEY/SECRET/PASSPHRASE) tanımlı değil — gerçek emir gönderilemez.',
    );
  }
  if (
    key.startsWith('REPLACE_') ||
    secret.startsWith('REPLACE_') ||
    passphrase.startsWith('REPLACE_')
  ) {
    throw new Error('OKX API credentials placeholder — gerçek değerlerle değiştirilmeli.');
  }

  const body = JSON.stringify({
    instId: toOkxInstId(input.symbol),
    tdMode: 'cash', // spot
    side: input.side,
    ordType: input.ordType ?? 'market',
    sz: String(input.quantity),
    ...(input.ordType === 'limit' && input.price ? { px: String(input.price) } : {}),
  });

  const timestamp = new Date().toISOString();
  const signature = sign(timestamp, 'POST', ORDER_PATH, body, secret);

  const res = await fetch(OKX_BASE + ORDER_PATH, {
    method: 'POST',
    headers: {
      'OK-ACCESS-KEY': key,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
    },
    body,
  });

  const json = (await res.json()) as OkxOrderResponse;
  const result = json.data?.[0];

  // OKX: code '0' = istek OK; her order için sCode '0' = order kabul
  if (json.code !== '0' || !result || result.sCode !== '0') {
    const detail = result?.sMsg || json.msg || 'bilinmeyen OKX hatası';
    throw new Error(`OKX emir reddedildi: ${detail} (code ${result?.sCode ?? json.code})`);
  }

  return {
    exchangeOrderId: result.ordId,
    accepted: true,
    message: result.sMsg || 'OKX emir kabul edildi',
  };
}
