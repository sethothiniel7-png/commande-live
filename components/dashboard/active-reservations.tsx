'use client';

import { Clock, MapPin, Phone, Package, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { Reservation } from '@/lib/types';
import { formatFCFA, formatPhone, formatCountdown, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type ActiveReservationsProps = {
  reservations: Reservation[];
  isLoading?: boolean;
};

const statusConfig = {
  pending: {
    label: 'En attente',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: Clock,
  },
  confirmed: {
    label: 'Acompte payé',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    icon: CheckCircle2,
  },
  delivered: {
    label: 'Livré',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expiré',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    icon: XCircle,
  },
  cancelled: {
    label: 'Annulé',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10 border-gray-500/20',
    icon: XCircle,
  },
};

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const secondsLeft = Math.max(0, Math.floor((expires - now) / 1000));
  const isUrgent = secondsLeft <= 120;

  return (
    <span
      className={cn(
        'text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded',
        isUrgent ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10',
        secondsLeft <= 60 && isUrgent && 'animate-pulse',
      )}
    >
      {formatCountdown(secondsLeft)}
    </span>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const config = statusConfig[reservation.status];
  const StatusIcon = config.icon;
  const isActive = reservation.status === 'pending' || reservation.status === 'confirmed';

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        config.bg,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{reservation.product?.image || '📦'}</span>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">
              {reservation.product?.name || 'Article'}
            </p>
            <p className="text-[11px] text-gray-400">
              Code {reservation.product?.code || '—'} · {formatRelativeTime(reservation.created_at)}
            </p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold', config.bg)}>
          <StatusIcon size={12} className={config.color} />
          <span className={config.color}>{config.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {reservation.zone}
        </span>
        <span className="flex items-center gap-1">
          <Phone size={12} /> {formatPhone(reservation.phone)}
        </span>
        {isActive && (
          <span className="flex items-center gap-1">
            <Package size={12} /> OTP {reservation.otp}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/5">
        <span className="text-sm font-bold text-white">{formatFCFA(reservation.price)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Acompte {formatFCFA(reservation.deposit)}</span>
          {reservation.status === 'pending' && <CountdownBadge expiresAt={reservation.expires_at} />}
        </div>
      </div>
    </div>
  );
}

export function ActiveReservations({ reservations, isLoading }: ActiveReservationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-8 text-center">
        <AlertTriangle size={24} className="text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Aucune réservation active</p>
        <p className="text-xs text-gray-600 mt-0.5">Les réservations apparaîtront ici pendant le live</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {reservations.map((r) => (
        <ReservationCard key={r.id} reservation={r} />
      ))}
    </div>
  );
}
