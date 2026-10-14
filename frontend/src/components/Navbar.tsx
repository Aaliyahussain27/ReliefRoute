import React from 'react';
import { Activity, Bell, Radio } from 'lucide-react';

interface NavbarProps {
  title: string;
  subtitle?: string;
  activeScenarioName?: string;
  onRefresh?: () => void;
  criticalAlertCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle,
  activeScenarioName = 'Baseline: Normal Operations',
  criticalAlertCount = 0
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Scenario Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full text-xs font-medium text-slate-700">
          <Radio className="w-3.5 h-3.5 text-relief-orange animate-pulse" />
          <span>Active State: <strong className="text-slate-900">{activeScenarioName}</strong></span>
        </div>

        {/* Status Callout */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
          <Activity className="w-3.5 h-3.5 text-amber-600" />
          <span>Post-Disaster Phase II (Rapid Allocation)</span>
        </div>

        {/* Alert Bell */}
        {criticalAlertCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-bold animate-pulse">
            <Bell className="w-3.5 h-3.5" />
            <span>{criticalAlertCount} Critical Alert{criticalAlertCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </header>
  );
};
