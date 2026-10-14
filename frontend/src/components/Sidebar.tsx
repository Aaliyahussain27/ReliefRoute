import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Warehouse,
  TrendingUp,
  Cpu,
  Truck,
  SlidersHorizontal,
  FileText,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onResetData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  onResetData
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'relief-centers', label: 'Relief Centers', icon: Building2 },
    { id: 'warehouses', label: 'Warehouses & Inventory', icon: Warehouse },
    { id: 'demand', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'optimizer', label: 'Allocation Optimizer', icon: Cpu },
    { id: 'routes', label: 'Delivery Routes', icon: Truck },
    { id: 'scenarios', label: 'Scenario Simulator', icon: SlidersHorizontal },
    { id: 'report', label: 'Emergency Report', icon: FileText },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-navy-900 border-r border-navy-700 text-slate-300 z-30 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-relief-orange flex items-center justify-center flex-shrink-0 shadow-lg shadow-relief-orange/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <h1 className="font-bold text-white text-lg tracking-tight">ReliefRoute</h1>
              <p className="text-[11px] text-relief-orange font-medium">CEP 8 Logistics</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-navy-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 bg-navy-800/50 border-b border-navy-800 text-[11px] text-slate-400 italic">
          "Smarter allocation. Faster relief. Fairer recovery."
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-relief-orange text-white shadow-md shadow-relief-orange/20 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* SDG Badges & Quick Action */}
      <div className="p-3 border-t border-navy-800 space-y-3">
        {!collapsed && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">UN SDG Alignment</p>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-medium text-center">
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 py-1 rounded">SDG 2 Zero Hunger</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-1 rounded">SDG 3 Health</span>
              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 py-1 rounded">SDG 11 Cities</span>
            </div>
          </div>
        )}

        <button
          onClick={onResetData}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-white bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-lg transition-colors"
          title="Reset sample dataset to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {!collapsed && <span>Reset Baseline Data</span>}
        </button>
      </div>
    </aside>
  );
};
