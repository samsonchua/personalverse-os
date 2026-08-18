import {
  Wallet, Banknote, CreditCard, PiggyBank, Landmark, TrendingUp,
  Building2, Coins, Car, Home, Briefcase, LucideIcon,
} from 'lucide-react';
import { FinanceAccount } from '../types';

export const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet, banknote: Banknote, 'credit-card': CreditCard, 'piggy-bank': PiggyBank,
  landmark: Landmark, 'trending-up': TrendingUp, building: Building2, coins: Coins,
  car: Car, home: Home, briefcase: Briefcase,
};

export const DEFAULT_ICON_BY_TYPE: Record<string, string> = {
  bank: 'landmark', cash: 'banknote', credit_card: 'credit-card',
  investment: 'trending-up', loan: 'building', asset: 'briefcase',
};

export const accountIconFor = (accountType: string, icon?: string): LucideIcon =>
  ACCOUNT_ICONS[icon || DEFAULT_ICON_BY_TYPE[accountType] || 'wallet'] || Wallet;

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Accounts', cash: 'Cash', credit_card: 'Credit Cards',
  investment: 'Investment Accounts', loan: 'Loan Accounts', asset: 'Asset Accounts', other: 'Other',
};
export const ACCOUNT_TYPE_ORDER = ['bank', 'cash', 'credit_card', 'investment', 'loan', 'asset'];

/** Groups accounts by account_type in a fixed, sensible order; any unrecognized type is bucketed
 * under "Other" at the end rather than dropped. */
export const groupAccountsByType = <T extends FinanceAccount>(accounts: T[]): { type: string; label: string; accounts: T[] }[] => {
  const grouped = ACCOUNT_TYPE_ORDER
    .map((type) => ({ type, label: ACCOUNT_TYPE_LABELS[type], accounts: accounts.filter((a) => a.account_type === type) }))
    .filter((g) => g.accounts.length > 0);
  const other = accounts.filter((a) => !ACCOUNT_TYPE_ORDER.includes(a.account_type));
  if (other.length) grouped.push({ type: 'other', label: ACCOUNT_TYPE_LABELS.other, accounts: other });
  return grouped;
};
