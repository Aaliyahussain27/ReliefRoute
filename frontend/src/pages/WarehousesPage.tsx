import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Upload,
  Download,
  Edit2,
  CheckCircle2,
  XCircle,
  Package,
  Droplets,
  HeartPulse
} from 'lucide-react';
import type { Warehouse, OperatingStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient } from '../api/client';
import { formatNumber } from '../utils/formatters';

interface WarehousesPageProps {
  warehouses: Warehouse[];
  onRefresh: () => void;
}

export const WarehousesPage: React.FC<WarehousesPageProps> = ({ warehouses, onRefresh }) => {
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingWh({
      id: `WH-0${warehouses.length + 1}`,
      name: '',
      lat: 14.58,
      lng: 121.02,
      food_stock_kg: 10000,
      water_stock_l: 20000,
      medical_kits: 200,
      dispatch_capacity_kg_per_day: 20000,
      operating_status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wh: Warehouse) => {
    setEditingWh({ ...wh });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWh) return;
    try {
      if (warehouses.some(w => w.id === editingWh.id)) {
        await apiClient.updateWarehouse(editingWh.id, editingWh);
      } else {
        await apiClient.createWarehouse(editingWh);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Failed to save warehouse: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadMessage(null);
      const res = await apiClient.uploadCsv(file, 'warehouses');
      if (res.success) {
        setUploadMessage({ type: 'success', text: `Imported ${res.imported_count} warehouses successfully.` });
        onRefresh();
      } else {
        setUploadMessage({ type: 'error', text: `Import errors: ${res.errors.join(', ')}` });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: `Failed to upload CSV: ${err.message}` });
    }
  };

  const totFood = warehouses.reduce((acc, w) => acc + w.food_stock_kg, 0);
  const totWater = warehouses.reduce((acc, w) => acc + w.water_stock_l, 0);
  const totMed = warehouses.reduce((acc, w) => acc + w.medical_kits, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <WarehouseIcon className="w-5 h-5 text-relief-blue" />
              Strategic Warehouses & Stockpiles ({warehouses.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Regional stockpile depots, commodity reserves, and daily dispatch processing thresholds
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={apiClient.getCsvTemplateUrl('warehouses')}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Template CSV
            </a>

            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-relief-blue hover:bg-relief-blueDark rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Warehouse
            </button>
          </div>
        </div>

        {uploadMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {uploadMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
            <span>{uploadMessage.text}</span>
          </div>
        )}

        {/* Global Stock Summaries */}
        <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg flex items-center gap-3">
            <Package className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-[11px] text-amber-800 font-medium">Total Regional Food Rations</p>
              <p className="text-base font-bold text-slate-900">{formatNumber(totFood)} kg</p>
            </div>
          </div>
          <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-lg flex items-center gap-3">
            <Droplets className="w-5 h-5 text-sky-600" />
            <div>
              <p className="text-[11px] text-sky-800 font-medium">Total Regional Potable Water</p>
              <p className="text-base font-bold text-slate-900">{formatNumber(totWater)} L</p>
            </div>
          </div>
          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-lg flex items-center gap-3">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <div>
              <p className="text-[11px] text-rose-800 font-medium">Total Emergency Medical Kits</p>
              <p className="text-base font-bold text-slate-900">{formatNumber(totMed)} units</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Warehouse ID & Name</th>
                <th className="py-3 px-4">Operating Status</th>
                <th className="py-3 px-4">Food Stock (kg)</th>
                <th className="py-3 px-4">Water Stock (L)</th>
                <th className="py-3 px-4">Medical Kits</th>
                <th className="py-3 px-4">Daily Dispatch Cap</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {warehouses.map((wh) => (
                <tr key={wh.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{wh.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {wh.id} &bull; ({wh.lat.toFixed(3)}, {wh.lng.toFixed(3)})
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={wh.operating_status} />
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {formatNumber(wh.food_stock_kg)} kg
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {formatNumber(wh.water_stock_l)} L
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {formatNumber(wh.medical_kits)} units
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatNumber(wh.dispatch_capacity_kg_per_day)} kg/day
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(wh)}
                      className="p-1.5 text-slate-500 hover:text-relief-blue hover:bg-slate-100 rounded transition-colors"
                      title="Edit warehouse inventory"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && editingWh && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4">
              {warehouses.some(w => w.id === editingWh.id) ? 'Edit Warehouse Depot' : 'Add New Warehouse'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Warehouse ID</label>
                  <input
                    type="text"
                    required
                    value={editingWh.id}
                    onChange={(e) => setEditingWh({ ...editingWh, id: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Facility Name</label>
                  <input
                    type="text"
                    required
                    value={editingWh.name}
                    onChange={(e) => setEditingWh({ ...editingWh, name: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingWh.lat}
                    onChange={(e) => setEditingWh({ ...editingWh, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingWh.lng}
                    onChange={(e) => setEditingWh({ ...editingWh, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Food Stock (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWh.food_stock_kg}
                    onChange={(e) => setEditingWh({ ...editingWh, food_stock_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Water Stock (L)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWh.water_stock_l}
                    onChange={(e) => setEditingWh({ ...editingWh, water_stock_l: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Medical Kits</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWh.medical_kits}
                    onChange={(e) => setEditingWh({ ...editingWh, medical_kits: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Daily Dispatch Cap (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWh.dispatch_capacity_kg_per_day}
                    onChange={(e) => setEditingWh({ ...editingWh, dispatch_capacity_kg_per_day: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Operating Status</label>
                  <select
                    value={editingWh.operating_status}
                    onChange={(e) => setEditingWh({ ...editingWh, operating_status: e.target.value as OperatingStatus })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Limited">Limited</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-relief-blue hover:bg-relief-blueDark text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
