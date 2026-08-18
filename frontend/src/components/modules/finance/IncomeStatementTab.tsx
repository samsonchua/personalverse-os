import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { api } from '../../../api/client';
import { IncomeStatement } from '../../../types';
import { formatCurrency } from '../../../lib/currency';
import { IncomeStatementGrid } from './IncomeStatementGrid';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export const IncomeStatementTab: React.FC = () => {
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [hoursWorked, setHoursWorked] = useState('');

  useEffect(() => {
    const hours = hoursWorked ? parseFloat(hoursWorked) : undefined;
    api.getIncomeStatement(thisMonth(), hours).then(setStatement);
  }, [hoursWorked]);

  return (
    <div className="space-y-6">
      <IncomeStatementGrid source="actual" />

      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-sm">Hourly Income (this month)</h3>
        <div className="flex items-center gap-3">
          <input
            type="number" step="0.5" min="0" placeholder="Hours worked this month"
            value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)}
            className="glass-input px-3.5 py-2 rounded-xl text-xs w-56"
          />
          {statement?.hourly_gross_income != null && (
            <div className="flex gap-4 text-xs">
              <span className="text-slate-400">Gross: <span className="font-bold text-emerald-400">{formatCurrency(statement.hourly_gross_income)}/hr</span></span>
              <span className="text-slate-400">Net: <span className="font-bold text-cyan-400">{formatCurrency(statement.hourly_net_income ?? 0)}/hr</span></span>
            </div>
          )}
        </div>
        {!hoursWorked && <p className="text-[11px] text-slate-500">Enter hours worked to see your effective hourly rate for this month.</p>}
      </GlassCard>
    </div>
  );
};
