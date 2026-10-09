'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: 'green' | 'blue' | 'red' | 'yellow';
  sublabel?: string;
};

const accentStyles = {
  green: {
    icon: 'text-emerald-400 bg-emerald-500/10',
    glow: 'shadow-emerald-500/5',
  },
  blue: {
    icon: 'text-sky-400 bg-sky-500/10',
    glow: 'shadow-sky-500/5',
  },
  red: {
    icon: 'text-rose-400 bg-rose-500/10',
    glow: 'shadow-rose-500/5',
  },
  yellow: {
    icon: 'text-amber-400 bg-amber-500/10',
    glow: 'shadow-amber-500/5',
  },
};

export function StatCard({ label, value, icon: Icon, accent, sublabel }: StatCardProps) {
  const styles = accentStyles[accent];
  return (
    <div
      className={cn(
        'bg-[#1a1b26] border border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-lg',
        styles.glow,
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', styles.icon)}>
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold text-white leading-tight truncate">{value}</p>
        {sublabel && <p className="text-[10px] text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
