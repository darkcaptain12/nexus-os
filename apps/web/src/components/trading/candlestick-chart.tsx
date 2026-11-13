import type { Candle } from '@/lib/quant/types';

// SVG candlestick chart — bağımlılıksız server component.
// Overlay dizileri (EMA/SMA/VWAP/Bollinger) candle indeksine hizalı line olarak çizilir;
// alt panelde hacim ve RSI gösterilir.

export interface ChartOverlay {
  name: string;
  colorClass: string; // Tailwind stroke rengi (örn. "stroke-blue-400")
  values: (number | null)[];
}

export interface CandlestickChartProps {
  candles: Candle[];
  overlays?: ChartOverlay[];
  rsi?: (number | null)[];
  height?: number;
}

const W = 800;
const PRICE_H = 260;
const VOLUME_H = 50;
const RSI_H = 60;
const PAD = 8;

function buildLinePath(
  values: (number | null)[],
  toX: (i: number) => number,
  toY: (v: number) => number,
): string {
  let d = '';
  let penDown = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      penDown = false;
      continue;
    }
    d += penDown
      ? ` L ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`
      : `M ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`;
    penDown = true;
  }
  return d;
}

export function CandlestickChart({ candles, overlays = [], rsi, height }: CandlestickChartProps) {
  if (candles.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center text-xs">
        Grafik verisi yok
      </div>
    );
  }

  const totalH = height ?? PRICE_H + VOLUME_H + (rsi ? RSI_H : 0) + PAD * 2;
  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const range = max - min || 1;
  const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;

  const n = candles.length;
  const slot = W / n;
  const bodyW = Math.max(1, slot * 0.6);

  const toX = (i: number): number => i * slot + slot / 2;
  const toY = (price: number): number => PAD + ((max - price) / range) * (PRICE_H - PAD * 2);
  const volTop = PRICE_H;
  const rsiTop = PRICE_H + VOLUME_H;

  const last = candles[n - 1]!;
  const lastColor = last.close >= last.open ? 'fill-green-400' : 'fill-red-400';

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      className="w-full"
      role="img"
      aria-label={`Candlestick grafik: ${n} mum, son fiyat ${last.close}`}
    >
      {/* Fiyat ızgarası */}
      {[0.25, 0.5, 0.75].map((f) => {
        const price = min + range * f;
        return (
          <g key={f}>
            <line
              x1={0}
              y1={toY(price)}
              x2={W}
              y2={toY(price)}
              className="stroke-border"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
            <text x={4} y={toY(price) - 3} className="fill-muted-foreground text-[9px]">
              {price.toFixed(price > 100 ? 0 : 4)}
            </text>
          </g>
        );
      })}

      {/* Mumlar */}
      {candles.map((c, i) => {
        const up = c.close >= c.open;
        const color = up ? 'stroke-green-400 fill-green-400' : 'stroke-red-400 fill-red-400';
        const x = toX(i);
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBottom = toY(Math.min(c.open, c.close));
        return (
          <g key={c.openTime} className={color}>
            <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} strokeWidth={1} />
            <rect
              x={x - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={Math.max(1, bodyBottom - bodyTop)}
              stroke="none"
            />
          </g>
        );
      })}

      {/* Overlay çizgileri (EMA/SMA/VWAP/Bollinger) */}
      {overlays.map((o) => (
        <path
          key={o.name}
          d={buildLinePath(o.values, toX, toY)}
          fill="none"
          strokeWidth={1.2}
          className={o.colorClass}
        />
      ))}

      {/* Son fiyat etiketi */}
      <text
        x={W - 4}
        y={toY(last.close) - 4}
        textAnchor="end"
        className={`${lastColor} text-[10px] font-semibold`}
      >
        {last.close}
      </text>

      {/* Hacim panel */}
      {candles.map((c, i) => {
        const h = (c.volume / maxVol) * (VOLUME_H - 6);
        const up = c.close >= c.open;
        return (
          <rect
            key={`v-${c.openTime}`}
            x={toX(i) - bodyW / 2}
            y={volTop + (VOLUME_H - 6) - h}
            width={bodyW}
            height={Math.max(0.5, h)}
            className={up ? 'fill-green-400/40' : 'fill-red-400/40'}
          />
        );
      })}
      <text x={4} y={volTop + 10} className="fill-muted-foreground text-[9px]">
        Hacim
      </text>

      {/* RSI panel */}
      {rsi && (
        <g>
          <line x1={0} y1={rsiTop} x2={W} y2={rsiTop} className="stroke-border" strokeWidth={0.5} />
          {[30, 70].map((level) => {
            const y = rsiTop + 6 + ((100 - level) / 100) * (RSI_H - 12);
            return (
              <line
                key={level}
                x1={0}
                y1={y}
                x2={W}
                y2={y}
                className="stroke-muted-foreground/30"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
            );
          })}
          <path
            d={buildLinePath(rsi, toX, (v) => rsiTop + 6 + ((100 - v) / 100) * (RSI_H - 12))}
            fill="none"
            strokeWidth={1.2}
            className="stroke-purple-400"
          />
          <text x={4} y={rsiTop + 12} className="fill-muted-foreground text-[9px]">
            RSI(14)
          </text>
        </g>
      )}
    </svg>
  );
}
