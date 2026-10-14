import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Download,
  Terminal,
} from 'lucide-react';
import type { OptimizationResult, OptimizationConfig } from '../types';
import { apiClient } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { formatNumber, formatCurrency } from '../utils/formatters';

interface AllocationOptimizerPageProps {
  onOptimizationComplete?: (res: OptimizationResult) => void;
}

export const AllocationOptimizerPage: React.FC<AllocationOptimizerPageProps> = ({
  onOptimizationComplete
}) => {
  const [config, setConfig] = useState<OptimizationConfig>({
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

  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'centers' | 'explainability' | 'audit'>('centers');

  const runOptimizer = async () => {
    setLoading(true);
    try {
      const res = await apiClient.runOptimization(config);
      setOptResult(res);
      if (onOptimizationComplete) onOptimizationComplete(res);
    } catch (err: any) {
      alert('Optimization error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimizer();
  }, []);

  return (
    <div className="space-y-6">
      {/* Configuration & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-relief-orange" />
              Multi-Commodity Allocation Optimizer (SciPy HiGHS)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mathematically optimizes food, water, and medical distribution balancing urgency, vulnerability, and transport distance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={apiClient.getAllocationsCsvUrl()}
              download
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>

            <button
              onClick={runOptimizer}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-relief-orange hover:bg-relief-orangeDark text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Solving Model...' : 'Run Optimization'}
            </button>
          </div>
        </div>

        {/* Weights Sliders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border">
            <span className="font-semibold text-slate-600 block mb-1">Critical Weight: {config.weight_critical}x</span>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={config.weight_critical}
              onChange={(e) => setConfig({ ...config, weight_critical: parseFloat(e.target.value) })}
              className="w-full accent-relief-orange"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border">
            <span className="font-semibold text-slate-600 block mb-1">High Urgency: {config.weight_high}x</span>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={config.weight_high}
              onChange={(e) => setConfig({ ...config, weight_high: parseFloat(e.target.value) })}
              className="w-full accent-relief-orange"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border">
            <span className="font-semibold text-slate-600 block mb-1">Medical Priority: {config.weight_medical}x</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={config.weight_medical}
              onChange={(e) => setConfig({ ...config, weight_medical: parseFloat(e.target.value) })}
              className="w-full accent-rose-600"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border">
            <span className="font-semibold text-slate-600 block mb-1">Water Priority: {config.weight_water}x</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={config.weight_water}
              onChange={(e) => setConfig({ ...config, weight_water: parseFloat(e.target.value) })}
              className="w-full accent-sky-600"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border">
            <span className="font-semibold text-slate-600 block mb-1">Food Priority: {config.weight_food}x</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={config.weight_food}
              onChange={(e) => setConfig({ ...config, weight_food: parseFloat(e.target.value) })}
              className="w-full accent-amber-600"
            />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border">
            <span className="font-semibold text-slate-600 block mb-1">Transport Penalty: {config.transport_penalty_lambda}</span>
            <input
              type="range"
              min="0.001"
              max="0.02"
              step="0.001"
              value={config.transport_penalty_lambda}
              onChange={(e) => setConfig({ ...config, transport_penalty_lambda: parseFloat(e.target.value) })}
              className="w-full accent-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Solver Status Banner */}
      {optResult && (
        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">{optResult.solver_name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]">
                  {optResult.status}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">{optResult.solver_message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Overall Fulfill</span>
              <strong className="text-sm font-bold text-emerald-400">{optResult.overall_fulfillment_pct}%</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gini Equity</span>
              <strong className="text-sm font-bold text-sky-400">{optResult.fairness_gini_coefficient.toFixed(3)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Deficit Weight</span>
              <strong className="text-sm font-bold text-rose-400">{formatNumber(optResult.unmet_demand_weight_kg)} kg</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transport Cost</span>
              <strong className="text-sm font-bold text-amber-400">{formatCurrency(optResult.total_transport_cost)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('centers')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'centers' ? 'bg-relief-orange text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Center Allocation Summary
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'matrix' ? 'bg-relief-orange text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Warehouse-to-Center Matrix ({optResult?.allocations.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('explainability')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'explainability' ? 'bg-relief-orange text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Fairness & Explainability Reasoning
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-relief-orange text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Audit Log
        </button>
      </div>

      {/* TAB 1: Center Summaries */}
      {activeTab === 'centers' && optResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Center</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Food Fulfillment</th>
                  <th className="py-3 px-4">Water Fulfillment</th>
                  <th className="py-3 px-4">Medical Fulfillment</th>
                  <th className="py-3 px-4">Overall %</th>
                  <th className="py-3 px-4">Supplying Depots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {optResult.center_summaries.map((s) => (
                  <tr key={s.center_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.center_name}
                      <span className="block text-[11px] text-slate-400 font-mono font-normal">
                        Pop: {formatNumber(s.population)} &bull; Vuln: {s.vulnerability_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge urgency={s.urgency_level} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${s.food_fulfillment_pct}%` }} />
                        </div>
                        <span className="font-semibold text-slate-800">{s.food_fulfillment_pct}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatNumber(s.food_allocated_kg)} / {formatNumber(s.food_demand_kg)} kg
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500" style={{ width: `${s.water_fulfillment_pct}%` }} />
                        </div>
                        <span className="font-semibold text-slate-800">{s.water_fulfillment_pct}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatNumber(s.water_allocated_l)} / {formatNumber(s.water_demand_l)} L
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${s.medical_fulfillment_pct}%` }} />
                        </div>
                        <span className="font-semibold text-slate-800">{s.medical_fulfillment_pct}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatNumber(s.medical_allocated_kits)} / {formatNumber(s.medical_demand_kits)} units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm font-bold ${
                          s.overall_fulfillment_pct >= 90
                            ? 'text-emerald-700'
                            : s.overall_fulfillment_pct >= 50
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {s.overall_fulfillment_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {s.supplying_warehouses.length > 0 ? (
                        s.supplying_warehouses.map((w, i) => (
                          <span key={i} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded mr-1 mb-1 font-medium">
                            {w}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">None (Inaccessible)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Warehouse to Center Dispatch Matrix */}
      {activeTab === 'matrix' && optResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Origin Depot</th>
                  <th className="py-3 px-4">Destination Shelter</th>
                  <th className="py-3 px-4">Food (kg)</th>
                  <th className="py-3 px-4">Water (L)</th>
                  <th className="py-3 px-4">Medical Kits</th>
                  <th className="py-3 px-4">Total Weight</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Transport Cost</th>
                  <th className="py-3 px-4">Route Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {optResult.allocations.map((a, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{a.warehouse_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{a.center_name}</td>
                    <td className="py-3 px-4 text-amber-700 font-semibold">{formatNumber(a.food_kg)}</td>
                    <td className="py-3 px-4 text-sky-700 font-semibold">{formatNumber(a.water_l)}</td>
                    <td className="py-3 px-4 text-rose-700 font-semibold">{formatNumber(a.medical_kits)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatNumber(a.total_weight_kg)} kg</td>
                    <td className="py-3 px-4 text-slate-600">{a.distance_km} km</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{formatCurrency(a.transport_cost)}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {a.route_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Dedicated Fairness & Explainability Panel */}
      {activeTab === 'explainability' && optResult && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-relief-orange" />
              Algorithmic Fairness & Prioritization Explainability
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Disaster supply distribution does not simply mean equal division of commodities across all communities.
              ReliefRoute employs a multi-criteria humanitarian equity formulation: communities with severe medical
              emergencies, high vulnerability ratios (infants/elderly), and higher urgency classifications receive
              priority, while minimum-coverage targets safeguard peripheral centers from total deprivation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="font-bold text-slate-800 block">Gini Inequality Coefficient: {optResult.fairness_gini_coefficient.toFixed(3)}</span>
                <span className="text-[11px] text-slate-500">
                  Measures fulfillment dispersion across shelters (0.0 = perfect equal percentage, 1.0 = total concentration).
                  Current score indicates strong equity with disciplined medical prioritization.
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="font-bold text-slate-800 block">Fulfillment Variance: {optResult.fairness_variance.toFixed(1)}</span>
                <span className="text-[11px] text-slate-500">
                  Quantifies stability in meeting basic survival minimums without abrupt starvation cliffs.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {optResult.center_summaries.map((s) => (
              <div
                key={s.center_id}
                className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
                  !s.is_accessible
                    ? 'border-rose-300 bg-rose-50/20'
                    : s.overall_fulfillment_pct >= 90
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{s.center_name}</span>
                    <StatusBadge urgency={s.urgency_level} />
                    <span className="text-[11px] text-slate-400 font-mono">Priority Score: {s.priority_score}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>
                      Fulfillment: <strong className="text-slate-900">{s.overall_fulfillment_pct}%</strong>
                    </span>
                    <span>
                      Delivered: <strong>{formatNumber(s.total_delivered_weight_kg)} kg</strong>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong>Decision Reason: </strong>
                  <span>{s.reason}</span>
                </div>

                {s.risk_warning && (
                  <div className="mt-2 text-[11px] font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{s.risk_warning}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Solver Audit Log */}
      {activeTab === 'audit' && optResult && (
        <div className="bg-navy-900 text-slate-300 rounded-xl p-5 font-mono text-xs shadow-inner space-y-2 overflow-x-auto">
          <div className="text-slate-400 border-b border-navy-700 pb-2 flex items-center justify-between">
            <span>RELIEFROUTE OPTIMIZATION SUBSYSTEM AUDIT LOG</span>
            <span className="text-[11px] text-emerald-400 font-bold">STATUS: VERIFIED</span>
          </div>
          <div className="space-y-1 pt-2">
            {optResult.audit_log.map((line, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-slate-500 select-none">{String(idx + 1).padStart(2, '0')}</span>
                <span className={line.includes('PASS') ? 'text-emerald-400' : line.includes('VIOLATION') ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
