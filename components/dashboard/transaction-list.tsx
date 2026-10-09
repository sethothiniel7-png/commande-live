'use client';

import { ArrowDownLeft, ArrowUpRight, Banknote, Percent, type LucideIcon } from 'lucide-react';
import type { Transaction, TransactionType } from '@/lib/types';
import { formatFCFA, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const typeConfig: Record<
  TransactionType,
  { icon: LucideIcon; label: string; color: string; bg: string }
> = {
  deposit: {
    icon: ArrowDownLeft,
    label: 'Acompte',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  sale: {
    icon: ArrowUpRight,
    label: 'Vente',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
  },
  withdrawal: {
    icon: Banknote,
    label: 'Retrait',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  commission: {
    icon: Percent,
    label: 'Commission',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
};

type TransactionItemProps = {
  transaction: Transaction;
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const config = typeConfig[transaction.type];
  const Icon = config.icon;
  const isCredit = transaction.amount > 0;
  const isPending = transaction.status === 'pending';

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {transaction.description || config.label}
        </p>
        <p className="text-[11px] text-gray-500">
          {config.label}
          {transaction.provider && ` · ${transaction.provider.replace('_', ' ')}`}
          {' · '}
          {formatRelativeTime(transaction.created_at)}
          {isPending && ' · En cours'}
        </p>
      </div>
      <div
        className={cn(
          'text-sm font-bold tabular-nums shrink-0',
          isCredit ? 'text-emerald-400' : 'text-rose-400',
        )}
      >
        {isCredit ? '+' : ''}
        {formatFCFA(transaction.amount)}
      </div>
    </div>
  );
}

type TransactionListProps = {
  transactions: Transaction[];
  isLoading?: boolean;
};

export function TransactionList({ transactions, isLoading }: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/5 rounded w-3/4" />
              <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
            <div className="h-3 bg-white/5 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-gray-500">Aucune transaction pour le moment</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.03]">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
