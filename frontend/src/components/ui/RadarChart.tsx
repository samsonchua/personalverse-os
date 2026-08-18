import React, { useState } from 'react';

interface RadarPoint {
  label: string;
  value: number; // 0..max
}

interface RadarChartProps {
  data: RadarPoint[];
  max?: number;
  size?: number;
  color?: string;
  title?: string;
}

const polarPoint = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const RadarChart: React.FC<RadarChartProps> = ({ data, max = 5, size = 320, color = '#3987e5', title }) => {
  const [hovered, setHovered] = useState<RadarPoint | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 70;
  const n = data.length;
  const rings = [1, 2, 3, 4, 5].filter((v) => v <= max);

  if (!n) {
    return <div className="flex items-center justify-center text-xs text-slate-500" style={{ height: size }}>No criteria yet</div>;
  }

  const anglePer = 360 / n;
  const dataPoints = data.map((d, i) => {
    const angle = i * anglePer;
    const pr = (Math.max(0, Math.min(d.value, max)) / max) * r;
    return { ...polarPoint(cx, cy, pr, angle), ...d, angle };
  });
  const polygonPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      {title && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>}
      <svg width={size} height={size} role="img" aria-label={title || 'Radar chart'}>
        {/* Grid rings */}
        {rings.map((ring) => {
          const ringR = (ring / max) * r;
          const points = Array.from({ length: n }, (_, i) => polarPoint(cx, cy, ringR, i * anglePer));
          return (
            <polygon
              key={ring}
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#383835"
              strokeWidth={1}
            />
          );
        })}
        {/* Spokes */}
        {data.map((_, i) => {
          const p = polarPoint(cx, cy, r, i * anglePer);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#2c2c2a" strokeWidth={1} />;
        })}
        {/* Data polygon */}
        <polygon points={polygonPath} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {/* Data point markers */}
        {dataPoints.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={hovered?.label === p.label ? 6 : 4}
            fill={color}
            stroke="#1a1a19"
            strokeWidth={1.5}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* Axis labels */}
        {data.map((d, i) => {
          const labelR = r + 34;
          const p = polarPoint(cx, cy, labelR, i * anglePer);
          const anchor = Math.abs(Math.cos(((i * anglePer - 90) * Math.PI) / 180)) < 0.15
            ? 'middle'
            : p.x > cx ? 'start' : 'end';
          return (
            <text key={d.label} x={p.x} y={p.y} textAnchor={anchor} dominantBaseline="middle" fontSize={11} fill="#c3c2b7">
              {d.label}
            </text>
          );
        })}
        {/* Ring value labels */}
        {rings.map((ring) => (
          <text key={ring} x={cx + 4} y={cy - (ring / max) * r} fontSize={9} fill="#898781">{ring}</text>
        ))}
      </svg>
      {hovered && (
        <p className="text-xs text-slate-300 mt-1">
          <span className="font-bold text-white">{hovered.label}</span>: <span style={{ color }} className="font-bold">{hovered.value}</span> / {max}
        </p>
      )}
    </div>
  );
};
