import React, { useState } from 'react';
import { formatCurrency } from '../../lib/currency';

interface TrendPoint {
  label: string;
  value: number;
}

const LINE_COLOR = '#3987e5';

export const TrendLineChart: React.FC<{ data: TrendPoint[]; height?: number; title?: string }> = ({ data, height = 220, title }) => {
  const [hovered, setHovered] = useState<TrendPoint | null>(null);
  const width = Math.max(data.length * 70, 320);
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (!data.length) {
    return <div className="flex items-center justify-center text-xs text-slate-500" style={{ height }}>No history yet</div>;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(0, ...values) * (Math.min(...values) < 0 ? 1.05 : 0.95);
  const max = Math.max(...values, 1) * 1.05;
  const scaleY = (v: number) => padding.top + innerH - ((v - min) / (max - min)) * innerH;
  const scaleX = (i: number) => padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value)}`).join(' ');
  const areaPath = `${linePath} L ${scaleX(data.length - 1)} ${scaleY(min)} L ${scaleX(0)} ${scaleY(min)} Z`;

  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>}
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.3} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          {min < 0 && <line x1={padding.left} y1={scaleY(0)} x2={width - padding.right} y2={scaleY(0)} stroke="#e66767" strokeDasharray="3,3" strokeWidth={1} />}
          <path d={areaPath} fill="url(#trendFill)" />
          <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} />
          {data.map((d, i) => (
            <g key={d.label}>
              <circle
                cx={scaleX(i)} cy={scaleY(d.value)} r={hovered?.label === d.label ? 5 : 3.5}
                fill={LINE_COLOR} stroke="#1a1a19" strokeWidth={1.5} className="cursor-pointer"
                onMouseEnter={() => setHovered(d)} onMouseLeave={() => setHovered(null)}
              />
              <text x={scaleX(i)} y={height - 8} textAnchor="middle" fontSize={9} fill="#898781">{d.label}</text>
            </g>
          ))}
        </svg>
      </div>
      {hovered && (
        <p className="text-xs text-slate-300">
          <span className="font-bold text-white">{hovered.label}</span>: <span style={{ color: LINE_COLOR }} className="font-bold">{formatCurrency(hovered.value)}</span>
        </p>
      )}
    </div>
  );
};
