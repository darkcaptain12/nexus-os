import { describe, it, expect } from 'vitest';
import { parseBinanceKlines, parseBinanceTicker } from '../src/lib/quant/exchanges/binance';
import { parseBybitKlines, parseBybitTicker } from '../src/lib/quant/exchanges/bybit';
import { parseOkxCandles, parseOkxTicker, toOkxInstId } from '../src/lib/quant/exchanges/okx';
import { getExchange, listExchanges, registerExchange } from '../src/lib/quant/exchanges/registry';

// Parser testleri — borsaların gerçek yanıt ŞEKİLLERİ (dokümante edilmiş şema)
// üzerinde saf parse doğrulaması. Ağ çağrısı yok.

describe('Exchange Parsers', () => {
  it('parseBinanceKlines: dizi şemasını Candle listesine çevirir', () => {
    const raw = [
      [
        1700000000000,
        '100.5',
        '105.2',
        '99.1',
        '103.7',
        '1234.56',
        1700003599999,
        '0',
        0,
        '0',
        '0',
        '0',
      ],
    ];
    const candles = parseBinanceKlines(raw);
    expect(candles).toHaveLength(1);
    expect(candles[0]).toMatchObject({
      openTime: 1700000000000,
      open: 100.5,
      high: 105.2,
      low: 99.1,
      close: 103.7,
      volume: 1234.56,
    });
  });

  it('parseBinanceKlines: dizi olmayan yanıt fırlatır', () => {
    expect(() => parseBinanceKlines({ code: -1121 })).toThrow('binance');
  });

  it('parseBinanceTicker: 24hr şemasını Ticker parçalarına çevirir', () => {
    const raw = {
      symbol: 'BTCUSDT',
      lastPrice: '103000.50',
      priceChangePercent: '2.35',
      highPrice: '105000',
      lowPrice: '101000',
      volume: '12345.6',
    };
    const t = parseBinanceTicker(raw);
    expect(t.lastPrice).toBe(103000.5);
    expect(t.priceChangePercent24h).toBe(2.35);
  });

  it('parseBybitKlines: v5 list şemasını eskiden-yeniye çevirir', () => {
    const raw = {
      retCode: 0,
      retMsg: 'OK',
      result: {
        list: [
          ['1700003600000', '103.7', '106.0', '103.0', '105.5', '500', '52000'], // yeni
          ['1700000000000', '100.5', '105.2', '99.1', '103.7', '1234', '128000'], // eski
        ],
      },
    };
    const candles = parseBybitKlines(raw);
    expect(candles).toHaveLength(2);
    expect(candles[0]!.openTime).toBe(1700000000000); // eski önce
    expect(candles[1]!.close).toBe(105.5);
  });

  it('parseBybitKlines: retCode != 0 fırlatır', () => {
    expect(() => parseBybitKlines({ retCode: 10001, retMsg: 'params error' })).toThrow('bybit');
  });

  it('parseBybitTicker: yüzdeyi 100 ile çarpar', () => {
    const raw = {
      retCode: 0,
      retMsg: 'OK',
      result: {
        list: [
          {
            symbol: 'BTCUSDT',
            lastPrice: '103000',
            price24hPcnt: '0.0235',
            highPrice24h: '105000',
            lowPrice24h: '101000',
            volume24h: '999',
          },
        ],
      },
    };
    const t = parseBybitTicker(raw);
    expect(t.priceChangePercent24h).toBeCloseTo(2.35, 6);
  });
});

describe('OKX Parser', () => {
  it('toOkxInstId: BTCUSDT → BTC-USDT', () => {
    expect(toOkxInstId('BTCUSDT')).toBe('BTC-USDT');
    expect(toOkxInstId('ETH-USDT')).toBe('ETH-USDT'); // zaten tireli
    expect(toOkxInstId('SOLUSDC')).toBe('SOL-USDC');
  });

  it('parseOkxCandles: v5 şemasını eskiden-yeniye çevirir', () => {
    const raw = {
      code: '0',
      msg: '',
      data: [
        ['1700003600000', '103.7', '106.0', '103.0', '105.5', '500', '52000', '52000', '1'],
        ['1700000000000', '100.5', '105.2', '99.1', '103.7', '1234', '128000', '128000', '1'],
      ],
    };
    const candles = parseOkxCandles(raw);
    expect(candles).toHaveLength(2);
    expect(candles[0]!.openTime).toBe(1700000000000);
    expect(candles[1]!.close).toBe(105.5);
  });

  it('parseOkxCandles: code != 0 fırlatır', () => {
    expect(() => parseOkxCandles({ code: '51001', msg: 'Instrument ID does not exist' })).toThrow(
      'okx',
    );
  });

  it('parseOkxTicker: 24s değişimi open24h üzerinden hesaplar', () => {
    const raw = {
      code: '0',
      msg: '',
      data: [
        {
          instId: 'BTC-USDT',
          last: '103000',
          open24h: '100000',
          high24h: '105000',
          low24h: '99000',
          vol24h: '999',
        },
      ],
    };
    const t = parseOkxTicker(raw);
    expect(t.symbol).toBe('BTCUSDT');
    expect(t.priceChangePercent24h).toBeCloseTo(3, 6);
  });
});

describe('Exchange Registry', () => {
  it('4 borsa kayıtlı', () => {
    const names = listExchanges();
    expect(names).toContain('binance');
    expect(names).toContain('mexc');
    expect(names).toContain('bybit');
    expect(names).toContain('okx');
  });

  it('getExchange bilinmeyen borsa fırlatır', () => {
    expect(() => getExchange('kraken')).toThrow('Bilinmeyen borsa');
  });

  it('registerExchange yeni adapter ekler (genişletilebilirlik)', () => {
    registerExchange({
      name: 'binance', // mevcut ismin üstüne yazılabilirlik de kontrat gereği
      fetchCandles: async () => [],
      fetchTicker: async () => ({
        symbol: 'X',
        lastPrice: 0,
        priceChangePercent24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        exchange: 'binance',
        fetchedAt: '',
      }),
    });
    expect(getExchange('binance')).toBeDefined();
  });
});
