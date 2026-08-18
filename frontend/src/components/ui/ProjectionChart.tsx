import React, { useState } from 'react';
import { formatCurrency } from '../../lib/currency';

interface ProjectionPoint {
  year: number;
  cumulative_balance: number;
}

const LINE_COLOR = '#3987e5';

export const ProjectionChart: React.FC<{ data: ProjectionPoint[] }> = ({ data }) => {
  const [hovered, setHovered] = useState<ProjectionPoint | null>(null);
  const width = Math.max(data.length * 80, 320);
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (!data.length) {
    return <div className="flex items-center justify-center text-xs text-slate-500 h-[220px]">No projection yet</div>;
  }

  const values = data.map((d) => d.cumulative_balance);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  const scaleY = (v: number) => padding.top + innerH - ((v - min) / (max - min)) * innerH;
  const scaleX = (i: number) => padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.cumulative_balance)}`).join(' ');
  const areaPath = `${linePath} L ${scaleX(data.length - 1)} ${scaleY(min)} L ${scaleX(0)} ${scaleY(min)} Z`;
  const zeroY = scaleY(0);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          {min < 0 && <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="#e66767" strokeDasharray="3,3" strokeWidth={1} />}
          <path d={areaPath} fill="url(#projectionFill)" />
          <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} />
          {data.map((d, i) => (
            <g key={d.year}>
              <circle
                cx={scaleX(i)}
                cy={scaleY(d.cumulative_balance)}
                r={hovered?.year === d.year ? 5 : 3.5}
                fill={LINE_COLOR}
                stroke="#1a1a19"
                strokeWidth={1.5}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(d)}
                onMouseLeave={() => setHovered(null)}
              />
              <text x={scaleX(i)} y={height - 8} textAnchor="middle" fontSize={10} fill="#898781">
                Y{d.year}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {hovered && (
        <p className="text-xs text-slate-300">
          <span className="font-bold text-white">Year {hovered.year}</span>: {' '}
          <span className="font-bold" style={{ color: LINE_COLOR }}>{formatCurrency(hovered.cumulative_balance)}</span>
        </p>
      )}
    </div>
  );
};
