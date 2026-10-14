import React from 'react';
import {
  Users,
  PackageCheck,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Droplets,
  HeartPulse,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { DashboardOverview, ReliefCenter, Warehouse, RoadSegment, DeliveryTrip } from '../types';
import { MetricCard } from '../components/MetricCard';
import { MapView } from '../components/MapView';
import { formatNumber, formatCurrency, formatPercent } from '../utils/formatters';

interface OverviewPageProps {
  overview: DashboardOverview | null;
  centers: ReliefCenter[];
  warehouses: Warehouse[];
  roadSegments: RoadSegment[];
  deliveryTrips: DeliveryTrip[];
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  overview,
  centers,
  warehouses,
  roadSegments,
  deliveryTrips,
  loading,
  onNavigate
}) => {
  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-relief-orange border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Calculating disaster logistics state...</p>
        </div>
      </div>
    );
  }

  // Chart data: Demand vs Inventory vs Allocated
  const comparisonData = overview.supply_category_summary.map((item) => ({
    name: item.category.split(' ')[0],
    Demanded: Math.round(item.demanded),
    AvailableStock: Math.round(item.inventory),
    Allocated: Math.round(item.allocated),
    fulfillment: item.fulfillment_pct
  }));

  // Urgency distribution colors
  const urgencyColors: Record<string, string> = {
    Critical: '#E11D48',
    High: '#F97316',
    Medium: '#0284C7',
    Low: '#10B981'
  };

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {overview.alerts && overview.alerts.length > 0 && (
        <div className="space-y-2">
          {overview.alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-sky-50 border-sky-200 text-sky-900'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  alert.severity === 'CRITICAL'
                    ? 'text-rose-600'
                    : alert.severity === 'WARNING'
                    ? 'text-amber-600'
                    : 'text-sky-600'
                }`}
              />
              <div className="flex-1">
                <h4 className="font-bold text-sm">{alert.title}</h4>
                <p className="text-xs mt-0.5 opacity-90">{alert.message}</p>
              </div>
              <button
                onClick={() => onNavigate(alert.type === 'ACCESSIBILITY' ? 'relief-centers' : 'optimizer')}
                className="text-xs font-semibold underline hover:opacity-80"
              >
                Inspect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Affected Population"
          value={formatNumber(overview.total_affected_population)}
          subtext={`${overview.total_relief_centers} shelters active`}
          icon={Users}
          colorScheme="blue"
          badgeText="Verified"
        />
        <MetricCard
          title="Demand Fulfillment"
          value={formatPercent(overview.demand_fulfilled_pct)}
          subtext={`${formatNumber(overview.unmet_demand_weight_kg)} kg unmet deficit`}
          icon={PackageCheck}
          colorScheme={overview.demand_fulfilled_pct >= 85 ? 'teal' : 'amber'}
          badgeText="Optimized"
        />
        <MetricCard
          title="Critical Centers"
          value={overview.critical_centers_count}
          subtext={`${overview.inaccessible_centers_count} center cut off`}
          icon={AlertTriangle}
          colorScheme={overview.critical_centers_count > 0 ? 'rose' : 'slate'}
          badgeText="Priority 1"
        />
        <MetricCard
          title="Logistics Expenditure"
          value={formatCurrency(overview.total_estimated_transport_cost)}
          subtext={`${formatNumber(overview.total_estimated_distance_km)} km total haul`}
          icon={DollarSign}
          colorScheme="orange"
          badgeText={`${overview.planned_deliveries_count} Dispatches`}
        />
      </div>

      {/* Map & Operational Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Regional Disaster Supply & Logistics Map</h3>
              <p className="text-xs text-slate-500">
                Warehouses, relief centers, planned convoy routes, and blocked bridges
              </p>
            </div>
            <button
              onClick={() => onNavigate('routes')}
              className="text-xs font-semibold text-relief-blue hover:text-relief-blueDark flex items-center gap-1"
            >
              View Route Details &rarr;
            </button>
          </div>
          <div className="flex-1 min-h-[460px]">
            <MapView
              centers={centers}
              warehouses={warehouses}
              roadSegments={roadSegments}
              deliveryTrips={deliveryTrips}
              height="460px"
              onSelectCenter={() => onNavigate('relief-centers')}
            />
          </div>
        </div>

        {/* Right Quick Summary Panel */}
        <div className="space-y-6 flex flex-col">
          {/* Inventory Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-relief-orange" />
              Strategic Reserve Inventory
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Food Rations Available</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(overview.total_food_inventory_kg)} kg</p>
                </div>
                <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-amber-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Drinking Water Reserves</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(overview.total_water_inventory_l)} L</p>
                </div>
                <div className="w-8 h-8 rounded bg-sky-100 flex items-center justify-center text-sky-700">
                  <Droplets className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Emergency Medical Kits</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(overview.total_medical_inventory_kits)} units</p>
                </div>
                <div className="w-8 h-8 rounded bg-rose-100 flex items-center justify-center text-rose-700">
                  <HeartPulse className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-slate-500 flex justify-between">
              <span>Fairness (Gini Index):</span>
              <strong className="text-slate-800">{overview.fairness_gini_coefficient.toFixed(3)} (Balanced)</strong>
            </div>
          </div>

          {/* Urgency Distribution Pie */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex-1 flex flex-col">
            <h3 className="font-bold text-slate-900 text-sm mb-2">Relief Center Urgency Profile</h3>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={overview.urgency_distribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {overview.urgency_distribution.map((entry) => (
                      <Cell key={`cell-${entry.level}`} fill={urgencyColors[entry.level] || '#64748B'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Demand vs Available Inventory Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Demand vs Available Inventory vs Allocated</h3>
            <p className="text-xs text-slate-500">
              Comparison across Food (kg), Drinking Water (L), and Medical Kits
            </p>
          </div>
          <button
            onClick={() => onNavigate('optimizer')}
            className="px-3 py-1.5 bg-relief-orange hover:bg-relief-orangeDark text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            Adjust Allocation Objective &rarr;
          </button>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip formatter={(value: any) => formatNumber(value)} />
              <Legend />
              <Bar dataKey="Demanded" fill="#94A3B8" name="Demanded Needs" radius={[4, 4, 0, 0]} />
              <Bar dataKey="AvailableStock" fill="#38BDF8" name="Available In Depots" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Allocated" fill="#F97316" name="Allocated Dispatch" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
