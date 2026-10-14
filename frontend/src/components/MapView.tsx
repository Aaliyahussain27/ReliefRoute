import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { ReliefCenter, Warehouse, RoadSegment, DeliveryTrip } from '../types';
import { formatNumber } from '../utils/formatters';

interface MapViewProps {
  centers: ReliefCenter[];
  warehouses: Warehouse[];
  roadSegments?: RoadSegment[];
  deliveryTrips?: DeliveryTrip[];
  height?: string;
  onSelectCenter?: (id: string) => void;
}

// Generate high-resolution HTML SVG marker icons without external PNG asset dependencies
function createWarehouseIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-warehouse-pin',
    html: `
      <div style="background-color: #0F172A; color: white; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #0284C7; box-shadow: 0 4px 10px rgba(0,0,0,0.35); font-weight: bold; font-size: 11px;">
        WH
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

function createCenterIcon(urgency: string, isAccessible: boolean): L.DivIcon {
  let bgColor = '#0284C7';
  if (!isAccessible) {
    bgColor = '#64748B'; // Muted grey if cut off
  } else if (urgency === 'Critical') {
    bgColor = '#E11D48'; // Rose red
  } else if (urgency === 'High') {
    bgColor = '#F97316'; // Orange
  } else if (urgency === 'Medium') {
    bgColor = '#0284C7'; // Blue
  } else {
    bgColor = '#10B981'; // Emerald
  }

  const borderStyle = !isAccessible ? 'border: 2px dashed #DC2626;' : 'border: 2.5px solid white;';

  return L.divIcon({
    className: 'custom-center-pin',
    html: `
      <div style="background-color: ${bgColor}; color: white; width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; ${borderStyle} box-shadow: 0 3px 8px rgba(0,0,0,0.3); font-weight: bold; font-size: 11px;">
        ${!isAccessible ? '✕' : urgency.charAt(0)}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -15]
  });
}

export const MapView: React.FC<MapViewProps> = ({
  centers,
  warehouses,
  roadSegments = [],
  deliveryTrips = [],
  height = '500px',
  onSelectCenter
}) => {
  // Region center coordinate (computed or default to Provincia de Esperanza cluster)
  const defaultCenter: [number, number] = [14.595, 121.02];

  // Helper map to lookup coordinates by ID
  const coordMap = new Map<string, [number, number]>();
  warehouses.forEach(w => coordMap.set(w.id, [w.lat, w.lng]));
  centers.forEach(c => coordMap.set(c.id, [c.lat, c.lng]));

  return (
    <div className="relative rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Road Segments Background (Inaccessible segments highlighted) */}
        {roadSegments.map((seg, idx) => {
          const fromCoord = coordMap.get(seg.from_id);
          const toCoord = coordMap.get(seg.to_id);
          if (!fromCoord || !toCoord) return null;

          const isBlocked = !seg.is_accessible;

          return (
            <Polyline
              key={`road-${idx}`}
              positions={[fromCoord, toCoord]}
              color={isBlocked ? '#DC2626' : '#94A3B8'}
              weight={isBlocked ? 4 : 2}
              dashArray={isBlocked ? '8, 8' : undefined}
              opacity={isBlocked ? 0.9 : 0.4}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <strong>{seg.from_id} ➔ {seg.to_id}</strong>
                  <div>Distance: {seg.distance_km} km ({seg.road_status})</div>
                  {isBlocked && <div className="text-rose-600 font-bold">ROAD BLOCKED: {seg.notes}</div>}
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* 2. Planned Delivery Route Lines */}
        {deliveryTrips.map((trip, idx) => {
          const fromCoord = coordMap.get(trip.warehouse_id);
          const toCoord = coordMap.get(trip.center_id);
          if (!fromCoord || !toCoord) return null;

          return (
            <Polyline
              key={`trip-${trip.trip_id}-${idx}`}
              positions={[fromCoord, toCoord]}
              color="#0284C7"
              weight={3.5}
              opacity={0.85}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <div className="font-bold text-sky-700">{trip.trip_id}: {trip.vehicle_type}</div>
                  <div>From: {trip.warehouse_id} ➔ {trip.center_name}</div>
                  <div>Cargo: {formatNumber(trip.cargo_weight_kg)} kg ({trip.distance_km} km)</div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* 3. Warehouse Markers */}
        {warehouses.map((wh) => (
          <Marker
            key={wh.id}
            position={[wh.lat, wh.lng]}
            icon={createWarehouseIcon()}
          >
            <Popup>
              <div className="p-1 min-w-[200px] text-xs">
                <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                  <span className="font-bold text-navy-900 text-sm">{wh.name}</span>
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {wh.id}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Food Stock:</span>
                    <strong className="text-slate-900">{formatNumber(wh.food_stock_kg)} kg</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Drinking Water:</span>
                    <strong className="text-slate-900">{formatNumber(wh.water_stock_l)} L</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Medical Kits:</span>
                    <strong className="text-slate-900">{formatNumber(wh.medical_kits)} units</strong>
                  </div>
                  <div className="flex justify-between border-t pt-1 text-[11px]">
                    <span>Dispatch Cap:</span>
                    <span>{formatNumber(wh.dispatch_capacity_kg_per_day)} kg/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold text-emerald-600">{wh.operating_status}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Relief Center Markers */}
        {centers.map((center) => (
          <Marker
            key={center.id}
            position={[center.lat, center.lng]}
            icon={createCenterIcon(center.urgency_level, center.is_accessible)}
            eventHandlers={{
              click: () => onSelectCenter && onSelectCenter(center.id)
            }}
          >
            <Popup>
              <div className="p-1 min-w-[210px] text-xs">
                <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                  <span className="font-bold text-slate-900 text-sm">{center.name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      center.urgency_level === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : center.urgency_level === 'High'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {center.urgency_level}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Affected Population:</span>
                    <strong className="text-slate-900">{formatNumber(center.affected_population)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Urgent Medical Cases:</span>
                    <strong className={center.medical_emergency_count > 0 ? 'text-rose-600 font-bold' : ''}>
                      {center.medical_emergency_count}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Vulnerability Index:</span>
                    <span>{center.vulnerability_score.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Access Status:</span>
                    <span className={`font-semibold ${center.is_accessible ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {center.is_accessible ? 'Road Open' : 'Cut Off'}
                    </span>
                  </div>
                  {center.road_closure_notes && (
                    <div className="mt-1 p-1 bg-slate-50 border rounded text-[10px] text-slate-500 italic">
                      {center.road_closure_notes}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 shadow-md text-xs space-y-1.5">
        <div className="font-bold text-slate-900 text-[11px] border-b pb-1">Map Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-navy-900 border border-sky-500 flex items-center justify-center text-[8px] text-white font-bold">WH</div>
          <span>Warehouse Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-600" />
          <span>Critical Relief Center</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>High Urgency Center</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500" />
          <span>Medium Urgency Center</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500 border border-rose-500 border-dashed" />
          <span>Inaccessible / Cut Off</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-sky-600" />
          <span>Active Delivery Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-rose-600" />
          <span>Blocked Road Segment</span>
        </div>
      </div>
    </div>
  );
};
