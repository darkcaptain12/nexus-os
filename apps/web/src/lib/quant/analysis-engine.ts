import type {
  Candle,
  Timeframe,
  ExchangeName,
  MarketAnalysis,
  MarketScenario,
  SwingPoint,
} from './types';
import { ema, rsi, atr, macd, lastDefined } from './indicators';
import { analyzeSmc } from './smc';
import { riskRewardRatio } from './risk-engine';

// AI Analiz Motoru — mevcut Executive "kural motoru" pattern'i:
// deterministik, kanıt listeli, explainable. Yeni AI motoru YOK.

function findSupportResistance(
  swings: SwingPoint[],
  lastPrice: number,
): { support: number[]; resistance: number[] } {
  const lows = swings.filter((s) => s.type === 'low' && s.price < lastPrice).map((s) => s.price);
  const highs = swings.filter((s) => s.type === 'high' && s.price > lastPrice).map((s) => s.price);
  const support = [...new Set(lows)].sort((a, b) => b - a).slice(0, 3);
  const resistance = [...new Set(highs)].sort((a, b) => a - b).slice(0, 3);
  return { support, resistance };
}

export function analyzeMarket(
  symbol: string,
  timeframe: Timeframe,
  exchange: ExchangeName,
  candles: Candle[],
): MarketAnalysis {
  const start = performance.now();
  const closes = candles.map((c) => c.close);
  const lastPrice = closes[closes.length - 1] ?? 0;

  const ema20 = lastDefined(ema(closes, 20));
  const ema50 = lastDefined(ema(closes, 50));
  const rsiSeries = rsi(closes, 14);
  const lastRsi = lastDefined(rsiSeries) ?? 50;
  const atrSeries = atr(candles, 14);
  const lastAtr = lastDefined(atrSeries) ?? 0;
  const macdResult = macd(closes);
  const lastHist = lastDefined(macdResult.histogram);

  const smc = analyzeSmc(candles);
  const { support, resistance } = findSupportResistance(smc.swings, lastPrice);

  // ── Trend ──
  const trendEvidence: string[] = [];
  let trendDirection: MarketAnalysis['trend']['direction'] = 'sideways';
  let trendStrength = 30;
  if (ema20 !== null && ema50 !== null) {
    if (ema20 > ema50 && lastPrice > ema20) {
      trendDirection = 'up';
      trendStrength = 70;
      trendEvidence.push(
        `Fiyat EMA20 (${ema20.toFixed(2)}) üstünde, EMA20 > EMA50 — yükseliş dizilimi`,
      );
    } else if (ema20 < ema50 && lastPrice < ema20) {
      trendDirection = 'down';
      trendStrength = 70;
      trendEvidence.push(
        `Fiyat EMA20 (${ema20.toFixed(2)}) altında, EMA20 < EMA50 — düşüş dizilimi`,
      );
    } else {
      trendEvidence.push('EMA20/EMA50 dizilimi net değil — yatay seyir');
    }
  }
  if (smc.structureBias !== 'neutral') {
    trendEvidence.push(`SMC yapı eğilimi: ${smc.structureBias}`);
    if (
      (smc.structureBias === 'bullish' && trendDirection === 'up') ||
      (smc.structureBias === 'bearish' && trendDirection === 'down')
    ) {
      trendStrength = Math.min(90, trendStrength + 15);
      trendEvidence.push('Yapı ve EMA trendi aynı yönde — güç artırıldı');
    }
  }

  // ── Momentum ──
  const momentumEvidence: string[] = [`RSI(14) = ${lastRsi.toFixed(1)}`];
  let momentumState: MarketAnalysis['momentum']['state'] = 'neutral';
  if (lastRsi >= 55) {
    momentumState = 'bullish';
    momentumEvidence.push('RSI 55 üstü — alıcı baskın');
  } else if (lastRsi <= 45) {
    momentumState = 'bearish';
    momentumEvidence.push('RSI 45 altı — satıcı baskın');
  }
  if (lastHist !== null) {
    momentumEvidence.push(
      `MACD histogram ${lastHist > 0 ? 'pozitif' : 'negatif'} (${lastHist.toFixed(4)})`,
    );
  }

  // ── Volatilite ──
  const atrPercent = lastPrice > 0 ? (lastAtr / lastPrice) * 100 : 0;
  const volatilityEvidence = [
    `ATR(14) = ${lastAtr.toFixed(4)} (fiyatın %${atrPercent.toFixed(2)}'i)`,
  ];
  const volatilityLevel: MarketAnalysis['volatility']['level'] =
    atrPercent > 3 ? 'high' : atrPercent < 1 ? 'low' : 'normal';
  volatilityEvidence.push(
    volatilityLevel === 'high'
      ? 'Yüksek volatilite — pozisyon boyutu küçültülmeli'
      : volatilityLevel === 'low'
        ? 'Düşük volatilite — sıkışma sonrası kırılım olasılığı'
        : 'Normal volatilite',
  );

  // ── Risk skoru (0-100) ──
  let riskScore = 30;
  if (volatilityLevel === 'high') riskScore += 25;
  if (lastRsi > 75 || lastRsi < 25) riskScore += 20;
  if (trendDirection === 'sideways') riskScore += 10;
  if (smc.premiumDiscount?.currentZone === 'premium' && trendDirection === 'up') riskScore += 10;
  riskScore = Math.min(100, riskScore);

  // ── Senaryolar ──
  const scenarios: MarketScenario[] = [];
  const nearestSupport = support[0] ?? lastPrice * 0.97;
  const nearestResistance = resistance[0] ?? lastPrice * 1.03;

  if (trendDirection !== 'down') {
    const entry = lastPrice;
    const stopLoss = Number((nearestSupport * 0.995).toFixed(6));
    const takeProfit = Number(nearestResistance.toFixed(6));
    scenarios.push({
      name: 'Trend devamı (long)',
      direction: 'long',
      probability: trendDirection === 'up' ? 55 + Math.round(trendStrength / 10) : 40,
      entry,
      stopLoss,
      takeProfit,
      riskRewardRatio: riskRewardRatio(entry, stopLoss, takeProfit) ?? 0,
      reasoning: `Destek ${nearestSupport} üstünde kalındıkça direnç ${nearestResistance} hedeflenir`,
    });
  }
  if (trendDirection !== 'up') {
    const entry = lastPrice;
    const stopLoss = Number((nearestResistance * 1.005).toFixed(6));
    const takeProfit = Number(nearestSupport.toFixed(6));
    scenarios.push({
      name: 'Düşüş devamı (short)',
      direction: 'short',
      probability: trendDirection === 'down' ? 55 + Math.round(trendStrength / 10) : 40,
      entry,
      stopLoss,
      takeProfit,
      riskRewardRatio: riskRewardRatio(entry, stopLoss, takeProfit) ?? 0,
      reasoning: `Direnç ${nearestResistance} altında kalındıkça destek ${nearestSupport} hedeflenir`,
    });
  }
  scenarios.push({
    name: 'Bekle-gör (neutral)',
    direction: 'neutral',
    probability: trendDirection === 'sideways' ? 50 : 20,
    entry: lastPrice,
    stopLoss: lastPrice,
    takeProfit: lastPrice,
    riskRewardRatio: 0,
    reasoning:
      riskScore > 60
        ? `Risk skoru yüksek (${riskScore}) — teyit beklenmeli`
        : 'Net kırılım gelene kadar pozisyon alınmaz',
  });

  // ── SMC özeti ──
  const recentEvents = smc.events.slice(-5);
  const smcSummary = recentEvents.map((e) => e.description);
  if (smc.premiumDiscount) {
    smcSummary.push(
      `Fiyat range'in %${smc.premiumDiscount.zonePercent} seviyesinde — ${smc.premiumDiscount.currentZone} bölgesi (EQ: ${smc.premiumDiscount.equilibrium.toFixed(2)})`,
    );
  }

  return {
    symbol,
    timeframe,
    exchange,
    lastPrice,
    trend: { direction: trendDirection, strength: trendStrength, evidence: trendEvidence },
    momentum: { state: momentumState, rsi: Number(lastRsi.toFixed(1)), evidence: momentumEvidence },
    volatility: {
      level: volatilityLevel,
      atrPercent: Number(atrPercent.toFixed(2)),
      evidence: volatilityEvidence,
    },
    support,
    resistance,
    riskScore,
    scenarios,
    smcSummary,
    generatedBy: 'rule-engine',
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - start),
  };
}
