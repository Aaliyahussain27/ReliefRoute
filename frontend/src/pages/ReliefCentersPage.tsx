import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Upload,
  Download,
  Edit2,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { ReliefCenter, UrgencyLevel } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient } from '../api/client';
import { formatNumber } from '../utils/formatters';

interface ReliefCentersPageProps {
  centers: ReliefCenter[];
  onRefresh: () => void;
}

export const ReliefCentersPage: React.FC<ReliefCentersPageProps> = ({ centers, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [editingCenter, setEditingCenter] = useState<ReliefCenter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredCenters = centers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgencyFilter === 'all' || c.urgency_level === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  const handleOpenAdd = () => {
    setEditingCenter({
      id: `RC-0${centers.length + 1}`,
      name: '',
      lat: 14.60,
      lng: 121.00,
      affected_population: 2000,
      vulnerability_score: 0.50,
      urgency_level: 'Medium',
      medical_emergency_count: 0,
      is_accessible: true,
      road_closure_notes: '',
      local_food_stock_kg: 0,
      local_water_stock_l: 0,
      local_medical_kits: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (center: ReliefCenter) => {
    setEditingCenter({ ...center });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCenter) return;
    try {
      if (centers.some(c => c.id === editingCenter.id)) {
        await apiClient.updateReliefCenter(editingCenter.id, editingCenter);
      } else {
        await apiClient.createReliefCenter(editingCenter);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert('Failed to save relief center: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadMessage(null);
      const res = await apiClient.uploadCsv(file, 'relief-centers');
      if (res.success) {
        setUploadMessage({ type: 'success', text: `Imported ${res.imported_count} relief centers successfully.` });
        onRefresh();
      } else {
        setUploadMessage({ type: 'error', text: `Import errors: ${res.errors.join(', ')}` });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: `Failed to upload CSV: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-relief-blue" />
              Relief Centers Directory ({centers.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage affected communities, casualty assessments, vulnerability indices, and accessibility
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download CSV Template */}
            <a
              href={apiClient.getCsvTemplateUrl('relief-centers')}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Template CSV
            </a>

            {/* Upload CSV */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Add Center */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-relief-orange hover:bg-relief-orangeDark rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Relief Center
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

        {/* Filters */}
        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by shelter name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-relief-blue/40"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="text-xs border rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Centers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID & Name</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Affected Pop</th>
                <th className="py-3 px-4">Vulnerability</th>
                <th className="py-3 px-4">Trauma Cases</th>
                <th className="py-3 px-4">Road Access</th>
                <th className="py-3 px-4">Pre-existing Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCenters.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {c.id} &bull; ({c.lat.toFixed(3)}, {c.lng.toFixed(3)})
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge urgency={c.urgency_level} />
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {formatNumber(c.affected_population)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            c.vulnerability_score > 0.75
                              ? 'bg-rose-500'
                              : c.vulnerability_score > 0.5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${c.vulnerability_score * 100}%` }}
                        />
                      </div>
                      <span className="font-medium text-slate-700">{c.vulnerability_score.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {c.medical_emergency_count > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        {c.medical_emergency_count} urgent
                      </span>
                    ) : (
                      <span className="text-slate-400">0 cases</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge isAccessible={c.is_accessible} />
                    {c.road_closure_notes && (
                      <p className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5" title={c.road_closure_notes}>
                        {c.road_closure_notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-600">
                    <div>Food: {c.local_food_stock_kg} kg</div>
                    <div>Water: {c.local_water_stock_l} L</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-slate-500 hover:text-relief-blue hover:bg-slate-100 rounded transition-colors"
                      title="Edit center details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCenters.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                    No relief centers matching current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && editingCenter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4">
              {centers.some(c => c.id === editingCenter.id) ? 'Edit Relief Center' : 'Add New Relief Center'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Center ID</label>
                  <input
                    type="text"
                    required
                    value={editingCenter.id}
                    onChange={(e) => setEditingCenter({ ...editingCenter, id: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Center / Shelter Name</label>
                  <input
                    type="text"
                    required
                    value={editingCenter.name}
                    onChange={(e) => setEditingCenter({ ...editingCenter, name: e.target.value })}
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
                    value={editingCenter.lat}
                    onChange={(e) => setEditingCenter({ ...editingCenter, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingCenter.lng}
                    onChange={(e) => setEditingCenter({ ...editingCenter, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Affected Population</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingCenter.affected_population}
                    onChange={(e) => setEditingCenter({ ...editingCenter, affected_population: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Urgency Level</label>
                  <select
                    value={editingCenter.urgency_level}
                    onChange={(e) => setEditingCenter({ ...editingCenter, urgency_level: e.target.value as UrgencyLevel })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none bg-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vulnerability (0.0 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={editingCenter.vulnerability_score}
                    onChange={(e) => setEditingCenter({ ...editingCenter, vulnerability_score: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Acute Trauma / Emergencies</label>
                  <input
                    type="number"
                    min="0"
                    value={editingCenter.medical_emergency_count}
                    onChange={(e) => setEditingCenter({ ...editingCenter, medical_emergency_count: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Road Accessibility</label>
                  <select
                    value={editingCenter.is_accessible ? 'true' : 'false'}
                    onChange={(e) => setEditingCenter({ ...editingCenter, is_accessible: e.target.value === 'true' })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none bg-white"
                  >
                    <option value="true">Passable (Open to Convoys)</option>
                    <option value="false">Cut Off / Inaccessible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Road Condition Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Submerged bridge, landslide debris clearance in progress"
                  value={editingCenter.road_closure_notes}
                  onChange={(e) => setEditingCenter({ ...editingCenter, road_closure_notes: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-relief-blue/30 focus:outline-none"
                />
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
                  className="px-4 py-2 bg-relief-orange hover:bg-relief-orangeDark text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Relief Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
