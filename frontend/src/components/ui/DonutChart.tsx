import React, { useState } from 'react';
import { formatCurrency } from '../../lib/currency';

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
};

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 220, thickness = 28, centerLabel }) => {
  const [hovered, setHovered] = useState<Slice | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness / 2 - 4;

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center text-xs text-slate-500" style={{ width: size, height: size }}>
        No data yet
      </div>
    );
  }

  const GAP_DEG = 2; // 2px-equivalent surface gap between segments
  let cursor = 0;
  const segments = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const startAngle = cursor + GAP_DEG / 2;
    const endAngle = cursor + sweep - GAP_DEG / 2;
    cursor += sweep;
    return { ...d, startAngle: Math.max(startAngle, cursor - sweep), endAngle: Math.max(endAngle, startAngle) };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label="Spending by category">
          {segments.map((s) => (
            <path
              key={s.label}
              d={arcPath(cx, cy, r, s.startAngle, s.endAngle)}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              opacity={hovered && hovered.label !== s.label ? 0.35 : 1}
              className="transition-opacity duration-150 cursor-pointer"
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {hovered ? hovered.label : centerLabel || 'Total'}
          </span>
          <span className="text-xl font-extrabold text-white">
            {formatCurrency(hovered ? hovered.value : total, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Legend — always present for >=2 series */}
      <div className="flex-1 w-full space-y-1.5">
        {data.map((d) => (
          <div
            key={d.label}
            onMouseEnter={() => setHovered(d)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-slate-300 truncate">{d.label}</span>
            </div>
            <span className="font-bold text-white shrink-0 ml-2">{formatCurrency(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
