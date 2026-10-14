from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field

UrgencyLevel = Literal["Critical", "High", "Medium", "Low"]
OperatingStatus = Literal["Active", "Limited", "Closed"]
RoadStatus = Literal["Clear", "Partially Blocked", "Flooded / Bridge Out", "Landslide Hazard"]

class ReliefCenter(BaseModel):
    id: str = Field(..., description="Unique Relief Center ID, e.g., RC-01")
    name: str = Field(..., description="Name of the relief center / shelter")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    affected_population: int = Field(..., ge=0, description="Estimated population seeking relief")
    vulnerability_score: float = Field(default=0.5, ge=0.0, le=1.0, description="Vulnerability factor (0=low, 1=severe, e.g. children/elderly ratio)")
    urgency_level: UrgencyLevel = Field(default="Medium", description="Urgency classification")
    medical_emergency_count: int = Field(default=0, ge=0, description="Count of acute trauma/dialysis/urgent medical casualties")
    is_accessible: bool = Field(default=True, description="Whether roads allow vehicle access")
    road_closure_notes: str = Field(default="", description="Notes regarding access restrictions or bridges")
    local_food_stock_kg: float = Field(default=0.0, ge=0.0, description="Pre-existing community food stock")
    local_water_stock_l: float = Field(default=0.0, ge=0.0, description="Pre-existing community drinking water stock")
    local_medical_kits: float = Field(default=0.0, ge=0.0, description="Pre-existing community medical supplies")

class Warehouse(BaseModel):
    id: str = Field(..., description="Unique Warehouse ID, e.g., WH-01")
    name: str = Field(..., description="Warehouse or Logistics Depot name")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    food_stock_kg: float = Field(..., ge=0.0, description="Available food rations stock in kg")
    water_stock_l: float = Field(..., ge=0.0, description="Available drinking water in liters")
    medical_kits: float = Field(..., ge=0.0, description="Available standard emergency medical kits")
    dispatch_capacity_kg_per_day: float = Field(default=25000.0, ge=0.0, description="Daily dispatch handling capacity in kg")
    operating_status: OperatingStatus = Field(default="Active", description="Operating status")

class Vehicle(BaseModel):
    id: str = Field(..., description="Unique Vehicle ID, e.g., VEH-01")
    type: str = Field(..., description="Vehicle type, e.g. Heavy Relief Truck (10T)")
    max_payload_kg: float = Field(..., gt=0.0, description="Maximum payload capacity in kg")
    available_units: int = Field(default=1, ge=0, description="Available units in fleet")
    cost_per_km: float = Field(default=2.5, ge=0.0, description="Estimated operating cost per km in USD")
    max_water_volume_l: Optional[float] = Field(default=None, description="Max water volume limit if specialized tanker")
    max_medical_kits: Optional[float] = Field(default=None, description="Max medical kits limit if specialized refrigerated cargo")
    speed_kmh: float = Field(default=45.0, gt=0.0, description="Average transit speed in km/h considering post-disaster terrain")

class RoadSegment(BaseModel):
    from_id: str = Field(..., description="Origin node ID (Warehouse or Center)")
    to_id: str = Field(..., description="Destination node ID (Warehouse or Center)")
    distance_km: float = Field(..., gt=0.0, description="Road segment length in kilometers")
    estimated_travel_time_min: float = Field(..., gt=0.0, description="Estimated travel time in minutes")
    is_accessible: bool = Field(default=True, description="True if segment is open to transport")
    road_status: RoadStatus = Field(default="Clear", description="Physical condition of road")
    risk_delay_score: float = Field(default=1.0, ge=1.0, description="Delay multiplier due to debris/risk (1.0 = clear, 2.5 = severe slow-down)")
    notes: str = Field(default="", description="Field condition remarks")

class DemandCalculation(BaseModel):
    center_id: str
    center_name: str
    affected_population: int
    urgency_level: UrgencyLevel
    vulnerability_score: float
    planning_horizon_days: float
    food_demand_kg: float
    water_demand_l: float
    baseline_medical_kits: float
    emergency_medical_kits: float
    total_medical_kits: float
    gross_food_kg: float
    local_food_offset_kg: float
    gross_water_l: float
    local_water_offset_l: float
    gross_medical_kits: float
    local_medical_offset_kits: float
    assumptions_note: str

class DemandSummary(BaseModel):
    planning_horizon_days: float
    total_affected_population: int
    total_food_demand_kg: float
    total_water_demand_l: float
    total_medical_kits_demand: float
    total_gross_weight_kg: float
    centers_count: int
    critical_centers_count: int
    center_demands: List[DemandCalculation]
    parameters_used: Dict[str, Any]

class AllocationItem(BaseModel):
    warehouse_id: str
    warehouse_name: str
    center_id: str
    center_name: str
    food_kg: float
    water_l: float
    medical_kits: float
    total_weight_kg: float
    distance_km: float
    transport_cost: float
    is_reachable: bool = True
    route_status: str = "Clear"

class CenterAllocationSummary(BaseModel):
    center_id: str
    center_name: str
    urgency_level: UrgencyLevel
    population: int
    vulnerability_score: float
    is_accessible: bool
    priority_score: float
    food_demand_kg: float
    food_allocated_kg: float
    food_fulfillment_pct: float
    food_shortage_kg: float
    water_demand_l: float
    water_allocated_l: float
    water_fulfillment_pct: float
    water_shortage_l: float
    medical_demand_kits: float
    medical_allocated_kits: float
    medical_fulfillment_pct: float
    medical_shortage_kits: float
    overall_fulfillment_pct: float
    supplying_warehouses: List[str]
    total_delivered_weight_kg: float
    avg_delivery_distance_km: float
    reason: str
    risk_warning: Optional[str] = None

class DeliveryTrip(BaseModel):
    trip_id: str
    vehicle_id: str
    vehicle_type: str
    warehouse_id: str
    warehouse_name: str
    center_id: str
    center_name: str
    food_kg: float
    water_l: float
    medical_kits: float
    cargo_weight_kg: float
    payload_capacity_kg: float
    utilization_pct: float
    distance_km: float
    estimated_travel_time_min: float
    transport_cost: float
    priority_rank: int
    priority_justification: str
    road_condition: str
    intermediate_waypoints: List[str] = []

class OptimizationResult(BaseModel):
    status: str  # "OPTIMAL", "FEASIBLE", "FALLBACK_HEURISTIC", "INFEASIBLE"
    solver_name: str
    solver_message: str
    allocations: List[AllocationItem]
    center_summaries: List[CenterAllocationSummary]
    total_food_allocated_kg: float
    total_water_allocated_l: float
    total_medical_allocated_kits: float
    total_food_demand_kg: float
    total_water_demand_l: float
    total_medical_demand_kits: float
    overall_food_fulfillment_pct: float
    overall_water_fulfillment_pct: float
    overall_medical_fulfillment_pct: float
    overall_fulfillment_pct: float
    total_transport_distance_km: float
    total_transport_cost: float
    fairness_gini_coefficient: float
    fairness_variance: float
    unmet_critical_centers: int
    unmet_demand_weight_kg: float
    audit_log: List[str]
    constraint_violations: List[str] = []
    objective_weights_used: Dict[str, float]
