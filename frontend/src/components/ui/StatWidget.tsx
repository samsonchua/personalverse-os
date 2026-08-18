import React from 'react';
import { GlassCard } from './GlassCard';
import { LucideIcon } from 'lucide-react';

interface StatWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  change?: string;
  isPositive?: boolean;
}

export const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyanAccent',
  change,
  isPositive = true,
}) => {
  return (
    <GlassCard hoverEffect className="relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl font-extrabold text-white mt-1 group-hover:text-cyanAccent transition-colors">
            {value}
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {change && (
            <span
              className={`inline-flex items-center text-xs font-semibold mt-2 px-2 py-0.5 rounded-full ${
                isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isPositive ? '▲' : '▼'} {change}
            </span>
          )}
        </div>
        <div className={`p-3.5 rounded-xl bg-slate-800/80 border border-white/10 ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </GlassCard>
  );
};
