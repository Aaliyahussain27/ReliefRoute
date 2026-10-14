from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from .domain import (
    ReliefCenter, Warehouse, Vehicle, RoadSegment,
    DemandSummary, OptimizationResult, DeliveryTrip,
    CenterAllocationSummary
)

class DemandEstimateRequest(BaseModel):
    planning_horizon_days: float = Field(default=3.0, gt=0, le=30)
    food_kg_per_person_day: float = Field(default=0.50, gt=0)
    water_l_per_person_day: float = Field(default=3.00, gt=0)
    medical_kits_per_1000: float = Field(default=2.00, ge=0)
    emergency_kits_per_case: float = Field(default=1.00, ge=0)
    include_local_stocks: bool = Field(default=True)

class OptimizationRequest(BaseModel):
    planning_horizon_days: float = Field(default=3.0, gt=0)
    food_kg_per_person_day: float = Field(default=0.50, gt=0)
    water_l_per_person_day: float = Field(default=3.00, gt=0)
    medical_kits_per_1000: float = Field(default=2.00, ge=0)
    emergency_kits_per_case: float = Field(default=1.00, ge=0)
    weight_critical: float = Field(default=10.0, gt=0)
    weight_high: float = Field(default=5.0, gt=0)
    weight_medium: float = Field(default=2.5, gt=0)
    weight_low: float = Field(default=1.0, gt=0)
    weight_medical: float = Field(default=4.0, gt=0)
    weight_water: float = Field(default=3.0, gt=0)
    weight_food: float = Field(default=2.0, gt=0)
    transport_penalty_lambda: float = Field(default=0.005, ge=0)
    min_coverage_pct: float = Field(default=0.20, ge=0, le=1.0)
    enforce_min_coverage: bool = Field(default=True)

class DeliveryPlanRequest(BaseModel):
    optimization_result: Optional[OptimizationResult] = None
    override_vehicle_ids: Optional[List[str]] = None

class DeliveryPlanResponse(BaseModel):
    trips: List[DeliveryTrip]
    total_trips: int
    total_distance_km: float
    total_cost: float
    total_cargo_weight_kg: float
    vehicle_utilization_summary: Dict[str, Any]
    unserved_allocations_kg: float
    inaccessible_centers_unserved: List[str]

class ScenarioPresetRequest(BaseModel):
    scenario_id: str = Field(..., description="A: Normal, B: Road Closure, C: Supply Shortage, D: Medical Emergency, E: Combined")
    custom_name: Optional[str] = None
    road_closures: Optional[List[str]] = None          # List of "from_id:to_id" or center IDs
    warehouse_stock_multiplier: Optional[Dict[str, float]] = None # e.g. {"WH-01": 0.4}
    medical_emergency_surge: Optional[Dict[str, int]] = None    # e.g. {"RC-03": 150}

class ScenarioComparisonMetric(BaseModel):
    metric_name: str
    baseline_value: float
    scenario_value: float
    delta_value: float
    delta_pct: float
    unit: str
    is_favorable: bool

class CenterScenarioDelta(BaseModel):
    center_id: str
    center_name: str
    baseline_fulfillment_pct: float
    scenario_fulfillment_pct: float
    delta_fulfillment_pct: float
    baseline_unmet_kg: float
    scenario_unmet_kg: float
    status_change: str  # "Improved", "Degraded", "Unchanged", "Cut Off"
    primary_reason: str

class ScenarioComparisonResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    scenario_description: str
    key_metrics: List[ScenarioComparisonMetric]
    center_deltas: List[CenterScenarioDelta]
    trade_off_summary: str
    operational_recommendations: List[str]
    baseline_result: OptimizationResult
    scenario_result: OptimizationResult

class DashboardOverviewResponse(BaseModel):
    total_affected_population: int
    total_relief_centers: int
    critical_centers_count: int
    inaccessible_centers_count: int
    total_warehouses: int
    total_food_inventory_kg: float
    total_water_inventory_l: float
    total_medical_inventory_kits: float
    total_estimated_demand_weight_kg: float
    demand_fulfilled_pct: float
    unmet_demand_weight_kg: float
    planned_deliveries_count: int
    total_estimated_transport_cost: float
    total_estimated_distance_km: float
    fairness_gini_coefficient: float
    alerts: List[Dict[str, Any]]
    supply_category_summary: List[Dict[str, Any]]
    urgency_distribution: List[Dict[str, Any]]
    delivery_status_summary: Dict[str, Any]

class CSVImportResponse(BaseModel):
    success: bool
    imported_count: int
    warnings: List[str]
    errors: List[str]
    sample_records: List[Dict[str, Any]]
