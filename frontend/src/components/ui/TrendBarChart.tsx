import React, { useState } from 'react';
import { formatCurrency } from '../../lib/currency';

interface MonthPoint {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

const INCOME_COLOR = '#199e70'; // aqua — categorical slot 3
const EXPENSE_COLOR = '#e66767'; // red — categorical slot 8

const formatMonth = (m: string) => {
  const [, mm] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[parseInt(mm, 10) - 1] || m;
};

export const TrendBarChart: React.FC<{ data: MonthPoint[] }> = ({ data }) => {
  const [hovered, setHovered] = useState<{ month: string; type: 'income' | 'expense'; value: number } | null>(null);
  const height = 200;
  const barGroupWidth = 56;
  const barWidth = 16;
  const gap = 4;
  const width = Math.max(data.length * barGroupWidth, 240);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const scale = (v: number) => (v / max) * (height - 24);

  if (!data.length) {
    return <div className="flex items-center justify-center text-xs text-slate-500 h-[200px]">No data yet</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} /><span className="text-slate-300">Income</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: EXPENSE_COLOR }} /><span className="text-slate-300">Expense</span></div>
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block">
          <line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke="#383835" strokeWidth={1} />
          {data.map((d, i) => {
            const groupX = i * barGroupWidth + barGroupWidth / 2;
            const incomeH = scale(d.income);
            const expenseH = scale(d.expense);
            return (
              <g key={d.month}>
                <rect
                  x={groupX - barWidth - gap / 2}
                  y={height - 20 - incomeH}
                  width={barWidth}
                  height={incomeH}
                  rx={3}
                  fill={INCOME_COLOR}
                  opacity={hovered && hovered.month === d.month && hovered.type !== 'income' ? 0.5 : 1}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHovered({ month: d.month, type: 'income', value: d.income })}
                  onMouseLeave={() => setHovered(null)}
                />
                <rect
                  x={groupX + gap / 2}
                  y={height - 20 - expenseH}
                  width={barWidth}
                  height={expenseH}
                  rx={3}
                  fill={EXPENSE_COLOR}
                  opacity={hovered && hovered.month === d.month && hovered.type !== 'expense' ? 0.5 : 1}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHovered({ month: d.month, type: 'expense', value: d.expense })}
                  onMouseLeave={() => setHovered(null)}
                />
                <text x={groupX} y={height - 6} textAnchor="middle" fontSize={10} fill="#898781">
                  {formatMonth(d.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {hovered && (
        <p className="text-xs text-slate-300">
          <span className="font-bold text-white">{formatMonth(hovered.month)}</span> {hovered.type}: {' '}
          <span className="font-bold" style={{ color: hovered.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }}>
            {formatCurrency(hovered.value)}
          </span>
        </p>
      )}
    </div>
  );
};
