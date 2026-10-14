import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badgeText?: string;
  colorScheme?: 'orange' | 'blue' | 'teal' | 'rose' | 'amber' | 'slate';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  badgeText,
  colorScheme = 'blue',
  tooltip
}) => {
  const colorMap = {
    orange: {
      bg: 'bg-orange-50',
      iconText: 'text-orange-600',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    blue: {
      bg: 'bg-sky-50',
      iconText: 'text-sky-600',
      badgeBg: 'bg-sky-100 text-sky-800 border-sky-200'
    },
    teal: {
      bg: 'bg-teal-50',
      iconText: 'text-teal-600',
      badgeBg: 'bg-teal-100 text-teal-800 border-teal-200'
    },
    rose: {
      bg: 'bg-rose-50',
      iconText: 'text-rose-600',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200'
    },
    amber: {
      bg: 'bg-amber-50',
      iconText: 'text-amber-600',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    slate: {
      bg: 'bg-slate-100',
      iconText: 'text-slate-600',
      badgeBg: 'bg-slate-200 text-slate-800 border-slate-300'
    }
  };

  const scheme = colorMap[colorScheme];

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow relative overflow-hidden"
      title={tooltip}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</span>
            {badgeText && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${scheme.badgeBg}`}>
                {badgeText}
              </span>
            )}
          </div>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>

        <div className={`w-11 h-11 rounded-lg ${scheme.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${scheme.iconText}`} />
        </div>
      </div>
    </div>
  );
};
