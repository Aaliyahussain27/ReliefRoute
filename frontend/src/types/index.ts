export type UrgencyLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type OperatingStatus = 'Active' | 'Limited' | 'Closed';
export type RoadStatus = 'Clear' | 'Partially Blocked' | 'Flooded / Bridge Out' | 'Landslide Hazard';

export interface ReliefCenter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  affected_population: number;
  vulnerability_score: number;
  urgency_level: UrgencyLevel;
  medical_emergency_count: number;
  is_accessible: boolean;
  road_closure_notes: string;
  local_food_stock_kg: number;
  local_water_stock_l: number;
  local_medical_kits: number;
}

export interface Warehouse {
  id: string;
  name: string;
  lat: number;
  lng: number;
  food_stock_kg: number;
  water_stock_l: number;
  medical_kits: number;
  dispatch_capacity_kg_per_day: number;
  operating_status: OperatingStatus;
}

export interface Vehicle {
  id: string;
  type: string;
  max_payload_kg: number;
  available_units: number;
  cost_per_km: number;
  speed_kmh: number;
  max_water_volume_l?: number;
  max_medical_kits?: number;
}

export interface RoadSegment {
  id?: number;
  from_id: string;
  to_id: string;
  distance_km: number;
  estimated_travel_time_min: number;
  is_accessible: boolean;
  road_status: RoadStatus;
  risk_delay_score: number;
  notes: string;
}

export interface DemandCalculation {
  center_id: string;
  center_name: string;
  affected_population: number;
  urgency_level: UrgencyLevel;
  vulnerability_score: number;
  planning_horizon_days: number;
  food_demand_kg: number;
  water_demand_l: number;
  baseline_medical_kits: number;
  emergency_medical_kits: number;
  total_medical_kits: number;
  gross_food_kg: number;
  local_food_offset_kg: number;
  gross_water_l: number;
  local_water_offset_l: number;
  gross_medical_kits: number;
  local_medical_offset_kits: number;
  assumptions_note: string;
}

export interface DemandSummary {
  planning_horizon_days: number;
  total_affected_population: number;
  total_food_demand_kg: number;
  total_water_demand_l: number;
  total_medical_kits_demand: number;
  total_gross_weight_kg: number;
  centers_count: number;
  critical_centers_count: number;
  center_demands: DemandCalculation[];
  parameters_used: Record<string, any>;
}

export interface AllocationItem {
  warehouse_id: string;
  warehouse_name: string;
  center_id: string;
  center_name: string;
  food_kg: number;
  water_l: number;
  medical_kits: number;
  total_weight_kg: number;
  distance_km: number;
  transport_cost: number;
  is_reachable: boolean;
  route_status: string;
}

export interface CenterAllocationSummary {
  center_id: string;
  center_name: string;
  urgency_level: UrgencyLevel;
  population: number;
  vulnerability_score: number;
  is_accessible: boolean;
  priority_score: number;
  food_demand_kg: number;
  food_allocated_kg: number;
  food_fulfillment_pct: number;
  food_shortage_kg: number;
  water_demand_l: number;
  water_allocated_l: number;
  water_fulfillment_pct: number;
  water_shortage_l: number;
  medical_demand_kits: number;
  medical_allocated_kits: number;
  medical_fulfillment_pct: number;
  medical_shortage_kits: number;
  overall_fulfillment_pct: number;
  supplying_warehouses: string[];
  total_delivered_weight_kg: number;
  avg_delivery_distance_km: number;
  reason: string;
  risk_warning?: string;
}

export interface DeliveryTrip {
  trip_id: string;
  vehicle_id: string;
  vehicle_type: string;
  warehouse_id: string;
  warehouse_name: string;
  center_id: string;
  center_name: string;
  food_kg: number;
  water_l: number;
  medical_kits: number;
  cargo_weight_kg: number;
  payload_capacity_kg: number;
  utilization_pct: number;
  distance_km: number;
  estimated_travel_time_min: number;
  transport_cost: number;
  priority_rank: number;
  priority_justification: string;
  road_condition: string;
  intermediate_waypoints: string[];
}

export interface OptimizationResult {
  status: string;
  solver_name: string;
  solver_message: string;
  allocations: AllocationItem[];
  center_summaries: CenterAllocationSummary[];
  total_food_allocated_kg: number;
  total_water_allocated_l: number;
  total_medical_allocated_kits: number;
  total_food_demand_kg: number;
  total_water_demand_l: number;
  total_medical_demand_kits: number;
  overall_food_fulfillment_pct: number;
  overall_water_fulfillment_pct: number;
  overall_medical_fulfillment_pct: number;
  overall_fulfillment_pct: number;
  total_transport_distance_km: number;
  total_transport_cost: number;
  fairness_gini_coefficient: number;
  fairness_variance: number;
  unmet_critical_centers: number;
  unmet_demand_weight_kg: number;
  audit_log: string[];
  constraint_violations: string[];
  objective_weights_used: Record<string, number>;
}

export interface DeliveryPlanResponse {
  trips: DeliveryTrip[];
  total_trips: number;
  total_distance_km: number;
  total_cost: number;
  total_cargo_weight_kg: number;
  vehicle_utilization_summary: Record<string, any>;
  unserved_allocations_kg: number;
  inaccessible_centers_unserved: string[];
}

export interface ScenarioComparisonMetric {
  metric_name: string;
  baseline_value: number;
  scenario_value: number;
  delta_value: number;
  delta_pct: number;
  unit: string;
  is_favorable: boolean;
}

export interface CenterScenarioDelta {
  center_id: string;
  center_name: string;
  baseline_fulfillment_pct: number;
  scenario_fulfillment_pct: number;
  delta_fulfillment_pct: number;
  baseline_unmet_kg: number;
  scenario_unmet_kg: number;
  status_change: 'Improved' | 'Degraded' | 'Unchanged' | 'Cut Off';
  primary_reason: string;
}

export interface ScenarioComparisonResponse {
  scenario_id: string;
  scenario_name: string;
  scenario_description: string;
  key_metrics: ScenarioComparisonMetric[];
  center_deltas: CenterScenarioDelta[];
  trade_off_summary: string;
  operational_recommendations: string[];
  baseline_result: OptimizationResult;
  scenario_result: OptimizationResult;
}

export interface DashboardOverview {
  total_affected_population: number;
  total_relief_centers: number;
  critical_centers_count: number;
  inaccessible_centers_count: number;
  total_warehouses: number;
  total_food_inventory_kg: number;
  total_water_inventory_l: number;
  total_medical_inventory_kits: number;
  total_estimated_demand_weight_kg: number;
  demand_fulfilled_pct: number;
  unmet_demand_weight_kg: number;
  planned_deliveries_count: number;
  total_estimated_transport_cost: number;
  total_estimated_distance_km: number;
  fairness_gini_coefficient: number;
  alerts: Array<{
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    type: string;
    title: string;
    message: string;
  }>;
  supply_category_summary: Array<{
    category: string;
    demanded: number;
    allocated: number;
    inventory: number;
    fulfillment_pct: number;
  }>;
  urgency_distribution: Array<{
    level: string;
    count: number;
  }>;
  delivery_status_summary: {
    total_trips: number;
    total_distance_km: number;
    total_cost: number;
    total_cargo_weight_kg: number;
    active_vehicles: number;
  };
}

export interface OptimizationConfig {
  planning_horizon_days: number;
  food_kg_per_person_day: number;
  water_l_per_person_day: number;
  medical_kits_per_1000: number;
  emergency_kits_per_case: number;
  weight_critical: number;
  weight_high: number;
  weight_medium: number;
  weight_low: number;
  weight_medical: number;
  weight_water: number;
  weight_food: number;
  transport_penalty_lambda: number;
}
