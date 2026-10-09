export function formatFCFA(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F`;
}

export function formatCompactFCFA(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1).replace('.0', '')}M F`;
  }
  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}k F`;
  }
  return `${amount} F`;
}

export function formatPhone(phone: string): string {
  if (phone.length === 10) {
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 8)} ${phone.slice(8, 10)}`;
  }
  return phone;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
