import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Download,
  HelpCircle,
  ShieldAlert
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
import type { ScenarioComparisonResponse } from '../types';
import { apiClient } from '../api/client';

interface ScenarioSimulatorPageProps {
  onScenarioApplied?: (scen: ScenarioComparisonResponse) => void;
}

export const ScenarioSimulatorPage: React.FC<ScenarioSimulatorPageProps> = ({
  onScenarioApplied
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('B');
  const [comparison, setComparison] = useState<ScenarioComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const presets = [
    {
      id: 'A',
      title: 'Scenario A: Normal Operations',
      desc: 'Baseline post-disaster status. All open roads passable, 100% baseline inventory.'
    },
    {
      id: 'B',
      title: 'Scenario B: Major Road Closure',
      desc: 'Arterial bridge and coastal overpass severed by seismic damage. Forced onto detour passes.'
    },
    {
      id: 'C',
      title: 'Scenario C: Food & Water Shortage',
      desc: 'Port replenishment delayed. Warehouse A food/water cut 55%, Warehouse B cut 45%.'
    },
    {
      id: 'D',
      title: 'Scenario D: Urgent Medical Surge',
      desc: 'Waterborne outbreak surge at RC-04 and RC-07 (+135 trauma cases). Critical reprioritization.'
    },
    {
      id: 'E',
      title: 'Scenario E: Combined Disaster',
      desc: 'Compound catastrophe: Bridge collapse + 50% regional stock cut + mass medical casualties.'
    }
  ];

  const runSimulation = async (scenId: string) => {
    setSelectedScenario(scenId);
    setLoading(true);
    try {
      const res = await apiClient.runScenario(scenId);
      setComparison(res);
      if (onScenarioApplied) onScenarioApplied(res);
    } catch (err: any) {
      alert('Scenario execution failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation('B');
  }, []);

  // Comparison chart data
  const chartData = comparison ? [
    {
      name: 'Overall %',
      Baseline: comparison.baseline_result.overall_fulfillment_pct,
      Scenario: comparison.scenario_result.overall_fulfillment_pct,
    },
    {
      name: 'Food %',
      Baseline: comparison.baseline_result.overall_food_fulfillment_pct,
      Scenario: comparison.scenario_result.overall_food_fulfillment_pct,
    },
    {
      name: 'Water %',
      Baseline: comparison.baseline_result.overall_water_fulfillment_pct,
      Scenario: comparison.scenario_result.overall_water_fulfillment_pct,
    },
    {
      name: 'Medical %',
      Baseline: comparison.baseline_result.overall_medical_fulfillment_pct,
      Scenario: comparison.scenario_result.overall_medical_fulfillment_pct,
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Scenario Presets Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-relief-orange" />
              Disaster Scenario Simulation & Stress Testing
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate operational shocks while preserving the pristine baseline. Recomputes allocations, routes, and trade-offs.
            </p>
          </div>

          <a
            href={apiClient.getScenarioComparisonCsvUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Export Comparison CSV
          </a>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t">
          {presets.map((preset) => {
            const isSelected = selectedScenario === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => runSimulation(preset.id)}
                disabled={loading}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-relief-orange bg-orange-50/60 shadow-sm ring-2 ring-relief-orange/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-relief-orange text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {preset.id}
                    </span>
                    {isSelected && <span className="text-[10px] font-bold text-relief-orange uppercase">Active</span>}
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-1">{preset.title.split(': ')[1]}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{preset.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center gap-1 text-[11px] font-semibold text-relief-orange">
                  <span>Run Scenario</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-relief-orange border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">Simulating Scenario {selectedScenario}...</h4>
          <p className="text-xs text-slate-500 mt-1">Re-running multi-criteria optimization and calculating community impact deltas.</p>
        </div>
      )}

      {comparison && !loading && (
        <>
          {/* Active Scenario Banner */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-relief-orange font-bold text-[11px] uppercase tracking-wider block">
                Simulated Shock Active
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">{comparison.scenario_name}</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-2xl">{comparison.scenario_description}</p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-right min-w-[200px]">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Fulfillment Shift</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                {comparison.scenario_result.overall_fulfillment_pct >= comparison.baseline_result.overall_fulfillment_pct ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-lg font-extrabold text-white">
                  {comparison.baseline_result.overall_fulfillment_pct}% ➔ {comparison.scenario_result.overall_fulfillment_pct}%
                </span>
              </div>
            </div>
          </div>

          {/* Comparative Metrics Table & Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">Baseline vs Scenario Outcome Metrics</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Metric</th>
                      <th className="py-2.5 px-4">Baseline</th>
                      <th className="py-2.5 px-4">Scenario</th>
                      <th className="py-2.5 px-4">Delta</th>
                      <th className="py-2.5 px-4">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparison.key_metrics.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{m.metric_name}</td>
                        <td className="py-2.5 px-4 text-slate-600">{m.baseline_value} {m.unit}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{m.scenario_value} {m.unit}</td>
                        <td className="py-2.5 px-4 font-bold">
                          <span className={m.is_favorable ? 'text-emerald-700' : 'text-rose-700'}>
                            {m.delta_value > 0 ? `+${m.delta_value}` : m.delta_value} {m.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              m.is_favorable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.is_favorable ? 'FAVORABLE' : 'DEGRADED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparison Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Fulfillment Percentage Comparison</h4>
              <p className="text-xs text-slate-500 mb-4">Direct category side-by-side between baseline and shocked state</p>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Baseline" fill="#0284C7" name="Baseline Operations" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Scenario" fill="#EA580C" name="Scenario Stress Test" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Center Deltas Table: Gainers and Losers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">Community-Level Supply Impact & Re-Routing Reasons</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Relief Center</th>
                    <th className="py-3 px-4">Baseline %</th>
                    <th className="py-3 px-4">Scenario %</th>
                    <th className="py-3 px-4">Delta %</th>
                    <th className="py-3 px-4">Status Change</th>
                    <th className="py-3 px-4">Primary Operational Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparison.center_deltas.map((d) => (
                    <tr key={d.center_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {d.center_name}
                        <span className="block text-[11px] text-slate-400 font-mono font-normal">{d.center_id}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{d.baseline_fulfillment_pct}%</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{d.scenario_fulfillment_pct}%</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-extrabold ${
                            d.delta_fulfillment_pct > 0
                              ? 'text-emerald-600'
                              : d.delta_fulfillment_pct < 0
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {d.delta_fulfillment_pct > 0 ? `+${d.delta_fulfillment_pct}%` : `${d.delta_fulfillment_pct}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            d.status_change === 'Improved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status_change === 'Degraded'
                              ? 'bg-amber-100 text-amber-800'
                              : d.status_change === 'Cut Off'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {d.status_change}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[340px] leading-relaxed">
                        {d.primary_reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trade-off Analysis & Operational Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-relief-blue" />
                Operational Trade-off Analysis
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {comparison.trade_off_summary}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-relief-orange" />
                Logistics Command Recommendations
              </h4>
              <ul className="space-y-1.5 pt-1 text-xs text-slate-700">
                {comparison.operational_recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-relief-orange mt-1.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
