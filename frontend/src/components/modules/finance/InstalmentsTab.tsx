import React, { useEffect, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X, Trash2, CreditCard, ChevronDown, ChevronUp, Car } from 'lucide-react';
import { api } from '../../../api/client';
import { Loan, LoanScheduleRow, BalanceSheetItem, FinanceAccount } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

const LOAN_LABELS: Record<string, string> = {
  credit_card: 'Credit Card', car_loan: 'Car Loan', mortgage: 'Mortgage', other: 'Other',
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export const InstalmentsTab: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<BalanceSheetItem[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [loanType, setLoanType] = useState('car_loan');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [linkedAssetId, setLinkedAssetId] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleRow[] | null>(null);

  const [payingLoanId, setPayingLoanId] = useState<string | null>(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayStr());
  const [payMessage, setPayMessage] = useState<string | null>(null);

  const load = () => api.getLoans().then(setLoans);
  useEffect(() => {
    load();
    api.getBalanceSheet().then((sheet) => setAssets([...sheet.fixed_assets, ...sheet.current_assets]));
    api.getFinanceSummary().then((s) => {
      setAccounts(s.accounts || []);
      if (s.accounts?.length) setPayAccountId(s.accounts[0].id);
    });
  }, []);

  const resetForm = () => {
    setName(''); setPrincipal(''); setRate(''); setTenure(''); setStartDate(todayStr()); setLoanType('car_loan'); setLinkedAssetId(''); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !principal || !tenure) return;
    setSaving(true);
    try {
      await api.createLoan({
        name, loan_type: loanType as Loan['loan_type'], principal_amount: parseFloat(principal),
        annual_interest_rate: parseFloat(rate) || 0, tenure_months: parseInt(tenure), start_date: startDate,
        linked_asset_id: linkedAssetId || undefined,
      });
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteLoan(id);
    if (expandedId === id) { setExpandedId(null); setSchedule(null); }
    await load();
  };

  const toggleSchedule = async (loan: Loan) => {
    if (expandedId === loan.id) {
      setExpandedId(null);
      setSchedule(null);
      return;
    }
    const res = await api.getLoanSchedule(loan.id);
    setExpandedId(loan.id);
    setSchedule(res.schedule);
  };

  const openPayment = (loan: Loan) => {
    setPayingLoanId(payingLoanId === loan.id ? null : loan.id);
    setPayAmount(String(loan.monthly_payment));
    setPayDate(todayStr());
    setPayMessage(null);
  };

  const handleLogPayment = async (loan: Loan) => {
    if (!payAccountId) return;
    const res = await api.logLoanPayment(loan.id, {
      account_id: payAccountId, amount: payAmount ? parseFloat(payAmount) : undefined, date: payDate,
    });
    setPayMessage(
      res.depreciated_asset
        ? `Payment logged. ${res.depreciated_asset.name} depreciated by ${formatCurrency(res.depreciation_amount)} to ${formatCurrency(res.depreciated_asset.value)}.`
        : 'Payment logged.'
    );
    await load();
    api.getBalanceSheet().then((sheet) => setAssets([...sheet.fixed_assets, ...sheet.current_assets]));
  };

  const assetName = (id?: string) => assets.find((a) => a.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Instalment Plan
        </button>
      </div>

      {showForm && (
        <GlassCard hoverEffect={false} className="space-y-3 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">New Instalment Plan</h3>
            <button onClick={resetForm}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required placeholder="Name (e.g. Honda Civic Loan)" value={name} onChange={(e) => setName(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              {Object.entries(LOAN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input required type="number" step="0.01" placeholder="Principal amount (RM)" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="number" step="0.01" placeholder="Annual interest rate (%)" value={rate} onChange={(e) => setRate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input required type="number" placeholder="Tenure (months)" value={tenure} onChange={(e) => setTenure(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
            <select value={linkedAssetId} onChange={(e) => setLinkedAssetId(e.target.value)} className="md:col-span-2 glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
              <option value="">Link to a Balance Sheet asset (optional, e.g. the car)</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button type="submit" disabled={saving} className="md:col-span-3 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Instalment Plan'}
            </button>
          </form>
          <p className="text-[10px] text-slate-500">Linking an asset means every logged payment depreciates that asset's value by the payment amount.</p>
        </GlassCard>
      )}

      <div className="space-y-3">
        {loans.map((loan) => (
          <GlassCard key={loan.id} hoverEffect={false} className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyanAccent" />
                <div>
                  <h4 className="font-bold text-white text-sm">{loan.name}</h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10">
                      {LOAN_LABELS[loan.loan_type] || loan.loan_type}
                    </span>
                    {loan.linked_asset_id && assetName(loan.linked_asset_id) && (
                      <span className="text-[10px] font-bold text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 flex items-center gap-1">
                        <Car className="w-3 h-3" /> {assetName(loan.linked_asset_id)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(loan.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <p className="text-[10px] text-slate-500">Principal</p>
                <p className="font-bold text-white">{formatCurrency(loan.principal_amount)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <p className="text-[10px] text-slate-500">Monthly Payment</p>
                <p className="font-bold text-cyan-300">{formatCurrency(loan.monthly_payment)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <p className="text-[10px] text-slate-500">Total Interest</p>
                <p className="font-bold text-amber-400">{formatCurrency(loan.total_interest)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                <p className="text-[10px] text-slate-500">Payoff Date</p>
                <p className="font-bold text-white">{loan.payoff_date || '—'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleSchedule(loan)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-[11px] font-bold border border-violet-500/20">
                {expandedId === loan.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandedId === loan.id ? 'Hide' : 'View'} Full Breakdown
              </button>
              <button onClick={() => openPayment(loan)} className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/20">
                Log Payment
              </button>
            </div>

            {payingLoanId === loan.id && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className="glass-input px-2.5 py-1.5 rounded-lg text-[11px] bg-slate-900">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="glass-input px-2.5 py-1.5 rounded-lg text-[11px]" placeholder="Amount" />
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="glass-input px-2.5 py-1.5 rounded-lg text-[11px]" />
                </div>
                <button onClick={() => handleLogPayment(loan)} className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-[11px] font-bold">
                  Confirm Payment
                </button>
                {payMessage && <p className="text-[10px] text-emerald-400">{payMessage}</p>}
              </div>
            )}

            {expandedId === loan.id && schedule && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-white/5">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-slate-400 uppercase tracking-wider">
                      <th className="p-2 font-semibold">#</th>
                      <th className="p-2 font-semibold">Date</th>
                      <th className="p-2 font-semibold text-right">Payment</th>
                      <th className="p-2 font-semibold text-right">Principal</th>
                      <th className="p-2 font-semibold text-right">Interest</th>
                      <th className="p-2 font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {schedule.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-800/40">
                        <td className="p-2 text-slate-400">{row.month}</td>
                        <td className="p-2 text-slate-300">{row.date}</td>
                        <td className="p-2 text-right text-white font-semibold">{formatCurrency(row.payment)}</td>
                        <td className="p-2 text-right text-cyan-300">{formatCurrency(row.principal)}</td>
                        <td className="p-2 text-right text-amber-400">{formatCurrency(row.interest)}</td>
                        <td className="p-2 text-right text-slate-300">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        ))}
        {!loans.length && <p className="text-xs text-slate-500 text-center py-8">No instalment plans yet — add one above.</p>}
      </div>
    </div>
  );
};
