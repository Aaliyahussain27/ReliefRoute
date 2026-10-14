import React from 'react';
import { getUrgencyBadgeColor } from '../utils/formatters';

interface StatusBadgeProps {
  urgency?: string;
  status?: string;
  isAccessible?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ urgency, status, isAccessible }) => {
  if (urgency) {
    const style = getUrgencyBadgeColor(urgency);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {urgency}
      </span>
    );
  }

  if (isAccessible !== undefined) {
    return isAccessible ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Passable
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Cut Off
      </span>
    );
  }

  if (status) {
    const isGood = status === 'Active' || status === 'Clear' || status === 'OPTIMAL';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          isGood
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {status}
      </span>
    );
  }

  return null;
};
