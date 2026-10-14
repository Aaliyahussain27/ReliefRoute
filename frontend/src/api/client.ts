import type {
  DashboardOverview, ReliefCenter, Warehouse, Vehicle, RoadSegment,
  DemandSummary, OptimizationResult, DeliveryPlanResponse,
  ScenarioComparisonResponse, OptimizationConfig
} from '../types';

const API_BASE = '/api';

export const apiClient = {
  // Dashboard
  async getDashboard(): Promise<DashboardOverview> {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard overview');
    return res.json();
  },

  // Reset Dataset
  async resetDataset(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/reset-dataset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset dataset');
    return res.json();
  },

  // Relief Centers
  async getReliefCenters(): Promise<ReliefCenter[]> {
    const res = await fetch(`${API_BASE}/relief-centers`);
    if (!res.ok) throw new Error('Failed to fetch relief centers');
    return res.json();
  },

  async createReliefCenter(center: ReliefCenter): Promise<ReliefCenter> {
    const res = await fetch(`${API_BASE}/relief-centers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(center)
    });
    if (!res.ok) throw new Error('Failed to create relief center');
    return res.json();
  },

  async updateReliefCenter(id: string, center: ReliefCenter): Promise<ReliefCenter> {
    const res = await fetch(`${API_BASE}/relief-centers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(center)
    });
    if (!res.ok) throw new Error('Failed to update relief center');
    return res.json();
  },

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const res = await fetch(`${API_BASE}/warehouses`);
    if (!res.ok) throw new Error('Failed to fetch warehouses');
    return res.json();
  },

  async createWarehouse(wh: Warehouse): Promise<Warehouse> {
    const res = await fetch(`${API_BASE}/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wh)
    });
    if (!res.ok) throw new Error('Failed to create warehouse');
    return res.json();
  },

  async updateWarehouse(id: string, wh: Warehouse): Promise<Warehouse> {
    const res = await fetch(`${API_BASE}/warehouses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wh)
    });
    if (!res.ok) throw new Error('Failed to update warehouse');
    return res.json();
  },

  // Vehicles & Road Network
  async getVehicles(): Promise<Vehicle[]> {
    const res = await fetch(`${API_BASE}/vehicles`);
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  },

  async getRoadNetwork(): Promise<RoadSegment[]> {
    const res = await fetch(`${API_BASE}/road-network`);
    if (!res.ok) throw new Error('Failed to fetch road network');
    return res.json();
  },

  // Demand
  async estimateDemand(params?: Partial<OptimizationConfig>): Promise<DemandSummary> {
    const res = await fetch(`${API_BASE}/demand/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    });
    if (!res.ok) throw new Error('Failed to estimate demand');
    return res.json();
  },

  // Optimizer
  async runOptimization(config?: Partial<OptimizationConfig>): Promise<OptimizationResult> {
    const res = await fetch(`${API_BASE}/allocation/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {})
    });
    if (!res.ok) throw new Error('Failed to optimize allocation');
    return res.json();
  },

  // Delivery Planner
  async planDeliveries(optResult?: OptimizationResult): Promise<DeliveryPlanResponse> {
    const res = await fetch(`${API_BASE}/delivery/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optimization_result: optResult })
    });
    if (!res.ok) throw new Error('Failed to generate delivery plan');
    return res.json();
  },

  // Scenarios
  async runScenario(scenarioId: string, customOverrides?: any): Promise<ScenarioComparisonResponse> {
    const res = await fetch(`${API_BASE}/scenarios/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId, ...customOverrides })
    });
    if (!res.ok) throw new Error('Failed to run scenario');
    return res.json();
  },

  // Reports
  async generateReport(): Promise<{ markdown: string; generated_at: string; sections_count: number; active_scenario: string }> {
    const res = await fetch(`${API_BASE}/reports/generate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  },

  getReportPdfUrl(): string {
    return `${API_BASE}/reports/download/pdf`;
  },

  // CSV Import / Export
  getCsvTemplateUrl(entity: 'relief-centers' | 'warehouses'): string {
    return `${API_BASE}/export/csv/template/${entity}`;
  },

  getAllocationsCsvUrl(): string {
    return `${API_BASE}/export/csv/allocations`;
  },

  getDeliveriesCsvUrl(): string {
    return `${API_BASE}/export/csv/deliveries`;
  },

  getScenarioComparisonCsvUrl(): string {
    return `${API_BASE}/export/csv/scenario-comparison`;
  },

  async uploadCsv(file: File, entityType: 'relief-centers' | 'warehouses'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/import/csv?entity_type=${entityType}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('CSV upload failed');
    return res.json();
  }
};
