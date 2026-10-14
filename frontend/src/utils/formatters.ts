export function formatNumber(val: number | undefined | null, decimals = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  return '$' + val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(1)}%`;
}

export function getUrgencyBadgeColor(level: string): { bg: string; text: string; border: string; dot: string } {
  switch (level?.toLowerCase()) {
    case 'critical':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' };
    case 'high':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'medium':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'low':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
  }
}
