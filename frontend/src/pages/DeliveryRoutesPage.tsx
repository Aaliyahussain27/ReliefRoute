import React from 'react';
import {
  Truck,
  Download,
  Clock,
  AlertTriangle,
  Layers,
  MapPin
} from 'lucide-react';
import type { DeliveryPlanResponse, ReliefCenter, Warehouse, RoadSegment } from '../types';
import { MapView } from '../components/MapView';
import { apiClient } from '../api/client';
import { formatNumber, formatCurrency } from '../utils/formatters';

interface DeliveryRoutesPageProps {
  deliveryPlan: DeliveryPlanResponse | null;
  centers: ReliefCenter[];
  warehouses: Warehouse[];
  roadSegments: RoadSegment[];
}

export const DeliveryRoutesPage: React.FC<DeliveryRoutesPageProps> = ({
  deliveryPlan,
  centers,
  warehouses,
  roadSegments
}) => {
  if (!deliveryPlan) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
        <h3 className="font-bold text-slate-800 text-sm">Generating Vehicle Dispatch Schedules...</h3>
        <p className="text-xs text-slate-500 mt-1">Calculating vehicle payload capacities and accessible route corridors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Fleet Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-relief-blue" />
              Delivery Planning & Vehicle Fleet Dispatch Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-modal fleet routing respecting vehicle payload limits, accessible road corridors, and emergency priorities
            </p>
          </div>

          <a
            href={apiClient.getDeliveriesCsvUrl()}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Export Trip Sheets CSV
          </a>
        </div>

        {/* Fleet Performance Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-500 text-[11px] block">Scheduled Sorties</span>
            <strong className="text-lg font-bold text-slate-900">{deliveryPlan.total_trips} Trips</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-500 text-[11px] block">Total Cargo Hauled</span>
            <strong className="text-lg font-bold text-slate-900">{formatNumber(deliveryPlan.total_cargo_weight_kg)} kg</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-500 text-[11px] block">Total Fleet Travel</span>
            <strong className="text-lg font-bold text-sky-700">{formatNumber(deliveryPlan.total_distance_km)} km</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-500 text-[11px] block">Total Fleet Operating Cost</span>
            <strong className="text-lg font-bold text-amber-700">{formatCurrency(deliveryPlan.total_cost)}</strong>
          </div>
        </div>

        {/* Inaccessible Centers Warning */}
        {deliveryPlan.inaccessible_centers_unserved && deliveryPlan.inaccessible_centers_unserved.length > 0 && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div>
              <strong>Ground Fleet Isolation Warning: </strong>
              The following communities cannot be reached by standard road convoys due to severed bridges or floodwaters:{' '}
              <span className="font-semibold underline">{deliveryPlan.inaccessible_centers_unserved.join(', ')}</span>.
              Specialized amphibious transport (VEH-05) or rotary airlift required.
            </div>
          </div>
        )}
      </div>

      {/* Map & Fleet Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col">
          <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-relief-orange" />
            Active Convoy Corridors
          </h4>
          <div className="flex-1 min-h-[420px]">
            <MapView
              centers={centers}
              warehouses={warehouses}
              roadSegments={roadSegments}
              deliveryTrips={deliveryPlan.trips}
              height="420px"
            />
          </div>
        </div>

        {/* Fleet Utilization Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-relief-blue" />
            Fleet Class Utilization
          </h4>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1 text-xs">
            {Object.entries(deliveryPlan.vehicle_utilization_summary).map(([vName, stats]: [string, any]) => (
              <div key={vName} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span className="truncate max-w-[180px]">{vName}</span>
                  <span className="text-relief-blue">{stats.trips} Trips</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Total Distance:</span>
                  <span>{stats.total_km} km</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Cargo Carried:</span>
                  <span>{formatNumber(stats.total_weight_hauled_kg)} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="font-bold text-slate-900 text-sm">Dispatched Convoys & Manifests ({deliveryPlan.trips.length})</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Trip ID</th>
                <th className="py-3 px-4">Vehicle Assigned</th>
                <th className="py-3 px-4">Origin Hub</th>
                <th className="py-3 px-4">Destination Shelter</th>
                <th className="py-3 px-4">Cargo Load</th>
                <th className="py-3 px-4">Payload Util.</th>
                <th className="py-3 px-4">Distance & Time</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Operational Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deliveryPlan.trips.map((trip) => (
                <tr key={trip.trip_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {trip.trip_id}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{trip.vehicle_type}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{trip.vehicle_id}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{trip.warehouse_name}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{trip.center_name}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{formatNumber(trip.cargo_weight_kg)} kg</div>
                    <div className="text-[10px] text-slate-500">
                      Food: {trip.food_kg}kg | H2O: {trip.water_l}L | Med: {trip.medical_kits}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            trip.utilization_pct > 80 ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${trip.utilization_pct}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-700">{trip.utilization_pct}%</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Cap: {formatNumber(trip.payload_capacity_kg)} kg</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <div>{trip.distance_km} km</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{trip.estimated_travel_time_min} mins
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {formatCurrency(trip.transport_cost)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-[220px] text-[11px] leading-tight">
                    {trip.priority_justification}
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
