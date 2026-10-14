import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Info,
  Package,
  Droplets,
  HeartPulse,
  RefreshCw,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import type { DemandSummary, OptimizationConfig } from '../types';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { formatNumber } from '../utils/formatters';

interface DemandForecastPageProps {
  onDemandUpdated?: () => void;
}

export const DemandForecastPage: React.FC<DemandForecastPageProps> = ({ onDemandUpdated }) => {
  const [params, setParams] = useState<OptimizationConfig>({
    planning_horizon_days: 3.0,
    food_kg_per_person_day: 0.50,
    water_l_per_person_day: 3.00,
    medical_kits_per_1000: 2.00,
    emergency_kits_per_case: 1.00,
    weight_critical: 10.0,
    weight_high: 5.0,
    weight_medium: 2.5,
    weight_low: 1.0,
    weight_medical: 4.0,
    weight_water: 3.0,
    weight_food: 2.0,
    transport_penalty_lambda: 0.005
  });

  const [demandSummary, setDemandSummary] = useState<DemandSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDemand = async () => {
    setLoading(true);
    try {
      const res = await apiClient.estimateDemand(params);
      setDemandSummary(res);
      if (onDemandUpdated) onDemandUpdated();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemand();
  }, []);

  const chartData = demandSummary?.center_demands.map((c) => ({
    name: c.center_id,
    Food: Math.round(c.food_demand_kg),
    Water: Math.round(c.water_demand_l),
    MedicalKits: Math.round(c.total_medical_kits)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Parameter Configuration & Formula Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-relief-blue" />
              Humanitarian Demand Estimation Engine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent, configurable food, drinking water, and medical demand calculations (Sphere Standards)
            </p>
          </div>

          <button
            onClick={fetchDemand}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-relief-blue hover:bg-relief-blueDark text-white text-xs font-semibold rounded-lg transition-colors shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate Demand
          </button>
        </div>

        {/* Sliders and Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Planning Horizon</span>
              <strong className="text-relief-blue">{params.planning_horizon_days} Days</strong>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              step="0.5"
              value={params.planning_horizon_days}
              onChange={(e) => setParams({ ...params, planning_horizon_days: parseFloat(e.target.value) })}
              className="w-full accent-relief-blue"
            />
            <span className="text-[10px] text-slate-400">Sphere emergency triage cycle</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Food Ration / Person</span>
              <strong className="text-relief-blue">{params.food_kg_per_person_day} kg/day</strong>
            </div>
            <input
              type="range"
              min="0.25"
              max="1.50"
              step="0.05"
              value={params.food_kg_per_person_day}
              onChange={(e) => setParams({ ...params, food_kg_per_person_day: parseFloat(e.target.value) })}
              className="w-full accent-relief-blue"
            />
            <span className="text-[10px] text-slate-400">~2,100 kcal daily dry rations</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Drinking Water / Person</span>
              <strong className="text-relief-blue">{params.water_l_per_person_day} L/day</strong>
            </div>
            <input
              type="range"
              min="1.5"
              max="7.5"
              step="0.5"
              value={params.water_l_per_person_day}
              onChange={(e) => setParams({ ...params, water_l_per_person_day: parseFloat(e.target.value) })}
              className="w-full accent-relief-blue"
            />
            <span className="text-[10px] text-slate-400">Essential drinking & hydration</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Baseline Med Kits</span>
              <strong className="text-relief-blue">{params.medical_kits_per_1000} / 1k pop</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={params.medical_kits_per_1000}
              onChange={(e) => setParams({ ...params, medical_kits_per_1000: parseFloat(e.target.value) })}
              className="w-full accent-relief-blue"
            />
            <span className="text-[10px] text-slate-400">General primary care units</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Emergency Trauma Ratio</span>
              <strong className="text-relief-blue">{params.emergency_kits_per_case} kit/case</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.5"
              value={params.emergency_kits_per_case}
              onChange={(e) => setParams({ ...params, emergency_kits_per_case: parseFloat(e.target.value) })}
              className="w-full accent-relief-blue"
            />
            <span className="text-[10px] text-slate-400">Dedicated acute injury packs</span>
          </div>
        </div>

        {/* Methodology & Validation Notice */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Humanitarian Planning Assumptions Notice:</strong> Baseline medical requirements are strictly
            separated from acute emergency casualty cases to prevent double-counting. All calculated figures represent
            logistics planning estimates that require validation by qualified emergency-response personnel on the ground,
            not universal medical prescriptions.
          </div>
        </div>
      </div>

      {/* Aggregate Demand Cards */}
      {demandSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Gross Cargo Haul</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatNumber(demandSummary.total_gross_weight_kg)} kg</p>
              <p className="text-[11px] text-slate-400">Total freight weight</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Food Rations</p>
              <p className="text-xl font-extrabold text-amber-700 mt-1">{formatNumber(demandSummary.total_food_demand_kg)} kg</p>
              <p className="text-[11px] text-slate-400">Net requirement</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Drinking Water</p>
              <p className="text-xl font-extrabold text-sky-700 mt-1">{formatNumber(demandSummary.total_water_demand_l)} L</p>
              <p className="text-[11px] text-slate-400">Potable water</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Droplets className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Medical Kits</p>
              <p className="text-xl font-extrabold text-rose-700 mt-1">{formatNumber(demandSummary.total_medical_kits_demand)} units</p>
              <p className="text-[11px] text-slate-400">Baseline + Trauma</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h4 className="font-bold text-slate-900 text-sm mb-3">Estimated Demand Breakdown by Relief Center</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip formatter={(val: any) => formatNumber(val)} />
              <Legend />
              <Bar dataKey="Food" fill="#F59E0B" name="Food (kg)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Water" fill="#0EA5E9" name="Water (L)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="MedicalKits" fill="#E11D48" name="Medical Kits (units)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Per-Center Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="font-bold text-slate-900 text-sm">Center-Level Demand Computation & Stock Offsets</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Center</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Population</th>
                <th className="py-3 px-4">Food Demand (Gross - Stock = Net)</th>
                <th className="py-3 px-4">Water Demand (Gross - Stock = Net)</th>
                <th className="py-3 px-4">Medical (Baseline + Trauma = Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {demandSummary?.center_demands.map((c) => (
                <tr key={c.center_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {c.center_name}
                    <span className="block text-[11px] text-slate-400 font-mono font-normal">{c.center_id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge urgency={c.urgency_level} />
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {formatNumber(c.affected_population)}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="text-slate-400 text-[11px]">{formatNumber(c.gross_food_kg)} - {formatNumber(c.local_food_offset_kg)} = </span>
                    <strong className="text-amber-800">{formatNumber(c.food_demand_kg)} kg</strong>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="text-slate-400 text-[11px]">{formatNumber(c.gross_water_l)} - {formatNumber(c.local_water_offset_l)} = </span>
                    <strong className="text-sky-800">{formatNumber(c.water_demand_l)} L</strong>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="text-slate-400 text-[11px]">{c.baseline_medical_kits.toFixed(1)} + {c.emergency_medical_kits.toFixed(1)} = </span>
                    <strong className="text-rose-800">{c.total_medical_kits.toFixed(1)} kits</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
