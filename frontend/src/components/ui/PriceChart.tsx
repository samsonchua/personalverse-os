import React, { useState } from 'react';
import { StockCandle } from '../../types';

const LINE_COLOR = '#3987e5';
const SMA20_COLOR = '#e5a339';
const SMA50_COLOR = '#8b6ce0';

const rollingAverage = (values: number[], period: number): (number | null)[] =>
  values.map((_, i) => (i < period - 1 ? null : values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period));

interface PriceChartProps {
  candles: StockCandle[];
  support: number;
  resistance: number;
  height?: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ candles, support, resistance, height = 280 }) => {
  const [hovered, setHovered] = useState<StockCandle | null>(null);
  const width = Math.max(candles.length * 4, 500);
  const padding = { top: 16, right: 16, bottom: 24, left: 16 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (!candles.length) {
    return <div className="flex items-center justify-center text-xs text-slate-500" style={{ height }}>No price data</div>;
  }

  const closes = candles.map((c) => c.close);
  const sma20 = rollingAverage(closes, 20);
  const sma50 = rollingAverage(closes, 50);

  const min = Math.min(...closes, support) * 0.98;
  const max = Math.max(...closes, resistance) * 1.02;
  const scaleY = (v: number) => padding.top + innerH - ((v - min) / (max - min)) * innerH;
  const scaleX = (i: number) => padding.left + (candles.length === 1 ? innerW / 2 : (i / (candles.length - 1)) * innerW);

  const linePath = (values: (number | null)[]) => {
    let path = '';
    let started = false;
    values.forEach((v, i) => {
      if (v === null) return;
      path += `${started ? 'L' : 'M'} ${scaleX(i)} ${scaleY(v)} `;
      started = true;
    });
    return path;
  };

  const closePath = linePath(closes);
  const areaPath = `${closePath} L ${scaleX(candles.length - 1)} ${scaleY(min)} L ${scaleX(0)} ${scaleY(min)} Z`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5" style={{ backgroundColor: LINE_COLOR }} /><span className="text-slate-300">Close</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5" style={{ backgroundColor: SMA20_COLOR }} /><span className="text-slate-300">SMA20</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5" style={{ backgroundColor: SMA50_COLOR }} /><span className="text-slate-300">SMA50</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 border-t border-dashed border-emerald-400" /><span className="text-slate-300">Support/Resistance</span></div>
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.25} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <line x1={padding.left} y1={scaleY(resistance)} x2={width - padding.right} y2={scaleY(resistance)} stroke="#e66767" strokeDasharray="4,3" strokeWidth={1} />
          <line x1={padding.left} y1={scaleY(support)} x2={width - padding.right} y2={scaleY(support)} stroke="#199e70" strokeDasharray="4,3" strokeWidth={1} />
          <path d={areaPath} fill="url(#priceFill)" />
          <path d={closePath} fill="none" stroke={LINE_COLOR} strokeWidth={1.75} />
          <path d={linePath(sma20)} fill="none" stroke={SMA20_COLOR} strokeWidth={1.25} opacity={0.85} />
          <path d={linePath(sma50)} fill="none" stroke={SMA50_COLOR} strokeWidth={1.25} opacity={0.85} />
          {candles.map((c, i) => (
            i % Math.max(1, Math.floor(candles.length / 60)) === 0 && (
              <rect
                key={c.date}
                x={scaleX(i) - 2}
                y={padding.top}
                width={4}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHovered(c)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          ))}
          {hovered && (
            <circle cx={scaleX(candles.indexOf(hovered))} cy={scaleY(hovered.close)} r={4} fill={LINE_COLOR} stroke="#1a1a19" strokeWidth={1.5} />
          )}
        </svg>
      </div>
      {hovered && (
        <p className="text-xs text-slate-300">
          <span className="font-bold text-white">{hovered.date}</span>: <span style={{ color: LINE_COLOR }} className="font-bold">{hovered.close.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
};
