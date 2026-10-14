"""
FastAPI REST API Endpoints for ReliefRoute.
Provides complete suite of disaster supply allocation, demand forecasting,
fleet dispatching, scenario simulation, CSV importing/exporting, and reporting APIs.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Response, Query
from fastapi.responses import StreamingResponse
import io

from ..models.domain import (
    ReliefCenter, Warehouse, Vehicle, RoadSegment,
    DemandSummary, OptimizationResult
)
from ..models.api_models import (
    DemandEstimateRequest, OptimizationRequest,
    DeliveryPlanRequest, DeliveryPlanResponse,
    ScenarioPresetRequest, ScenarioComparisonResponse,
    DashboardOverviewResponse, CSVImportResponse
)
from ..database import (
    db_get_relief_centers, db_save_relief_center,
    db_get_warehouses, db_save_warehouse,
    db_get_vehicles, db_get_road_segments,
    reset_to_default_dataset
)
from ..services.demand_engine import estimate_total_demand
from ..services.optimization_engine import solve_allocation_lp
from ..services.delivery_planner import generate_delivery_plan
from ..services.scenario_engine import (
    apply_scenario_modifications, compare_scenarios, SCENARIO_PRESETS_METADATA
)
from ..services.report_generator import generate_report_markdown, generate_report_pdf
from ..services.csv_service import (
    get_relief_centers_csv_template, get_warehouses_csv_template,
    parse_relief_centers_csv, parse_warehouses_csv,
    export_allocations_csv, export_deliveries_csv, export_scenario_comparison_csv
)

router = APIRouter(prefix="/api")

# Cached last computation results in memory for dashboard and rapid report generation
_CACHED_STATE: Dict[str, Any] = {
    "last_opt_result": None,
    "last_delivery_plan": None,
    "last_scenario_comparison": None,
    "active_scenario_id": "A"
}

def get_or_run_baseline_opt() -> Tuple[OptimizationResult, DeliveryPlanResponse]:
    centers = db_get_relief_centers()
    warehouses = db_get_warehouses()
    vehicles = db_get_vehicles()
    roads = db_get_road_segments()

    opt_req = OptimizationRequest()
    opt_res = solve_allocation_lp(warehouses, centers, roads, opt_req)
    deliv_res = generate_delivery_plan(opt_res.allocations, vehicles, centers, warehouses, roads)

    _CACHED_STATE["last_opt_result"] = opt_res
    _CACHED_STATE["last_delivery_plan"] = deliv_res
    return opt_res, deliv_res

# 1. Health
@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ReliefRoute API",
        "version": "1.0.0",
        "framework": "FastAPI + SciPy HiGHS Solver",
        "sdg_alignment": ["SDG 2: Zero Hunger", "SDG 3: Good Health", "SDG 11: Sustainable Cities"]
    }

# 2. Reset Dataset
@router.post("/reset-dataset")
def reset_dataset():
    reset_to_default_dataset()
    _CACHED_STATE["last_opt_result"] = None
    _CACHED_STATE["last_delivery_plan"] = None
    _CACHED_STATE["last_scenario_comparison"] = None
    _CACHED_STATE["active_scenario_id"] = "A"
    return {"message": "Dataset successfully reset to default CEP 8 demonstration baseline."}

# 3. Relief Centers
@router.get("/relief-centers", response_model=List[ReliefCenter])
def list_relief_centers():
    return db_get_relief_centers()

@router.post("/relief-centers", response_model=ReliefCenter)
def create_relief_center(center: ReliefCenter):
    db_save_relief_center(center)
    _CACHED_STATE["last_opt_result"] = None
    return center

@router.put("/relief-centers/{id}", response_model=ReliefCenter)
def update_relief_center(id: str, center: ReliefCenter):
    center.id = id
    db_save_relief_center(center)
    _CACHED_STATE["last_opt_result"] = None
    return center

# 4. Warehouses
@router.get("/warehouses", response_model=List[Warehouse])
def list_warehouses():
    return db_get_warehouses()

@router.post("/warehouses", response_model=Warehouse)
def create_warehouse(warehouse: Warehouse):
    db_save_warehouse(warehouse)
    _CACHED_STATE["last_opt_result"] = None
    return warehouse

@router.put("/warehouses/{id}", response_model=Warehouse)
def update_warehouse(id: str, warehouse: Warehouse):
    warehouse.id = id
    db_save_warehouse(warehouse)
    _CACHED_STATE["last_opt_result"] = None
    return warehouse

# 5. Vehicles & Road Network
@router.get("/vehicles", response_model=List[Vehicle])
def list_vehicles():
    return db_get_vehicles()

@router.get("/road-network", response_model=List[RoadSegment])
def list_road_network():
    return db_get_road_segments()

# 6. Demand Estimation
@router.post("/demand/estimate", response_model=DemandSummary)
def estimate_demand(req: DemandEstimateRequest = DemandEstimateRequest()):
    centers = db_get_relief_centers()
    return estimate_total_demand(centers, req)

# 7. Allocation Optimizer
@router.post("/allocation/optimize", response_model=OptimizationResult)
def optimize_allocation(req: OptimizationRequest = OptimizationRequest()):
    centers = db_get_relief_centers()
    warehouses = db_get_warehouses()
    roads = db_get_road_segments()

    res = solve_allocation_lp(warehouses, centers, roads, req)
    _CACHED_STATE["last_opt_result"] = res
    return res

# 8. Delivery Planning
@router.post("/delivery/plan", response_model=DeliveryPlanResponse)
def plan_delivery(req: DeliveryPlanRequest = DeliveryPlanRequest()):
    centers = db_get_relief_centers()
    warehouses = db_get_warehouses()
    vehicles = db_get_vehicles()
    roads = db_get_road_segments()

    opt_res = req.optimization_result or _CACHED_STATE["last_opt_result"]
    if not opt_res:
        opt_res = solve_allocation_lp(warehouses, centers, roads, OptimizationRequest())
        _CACHED_STATE["last_opt_result"] = opt_res

    plan = generate_delivery_plan(opt_res.allocations, vehicles, centers, warehouses, roads)
    _CACHED_STATE["last_delivery_plan"] = plan
    return plan

# 9. Scenarios
@router.get("/scenarios/presets")
def list_scenario_presets():
    return SCENARIO_PRESETS_METADATA

@router.post("/scenarios/run", response_model=ScenarioComparisonResponse)
def run_scenario(req: ScenarioPresetRequest):
    base_centers = db_get_relief_centers()
    base_warehouses = db_get_warehouses()
    base_roads = db_get_road_segments()
    base_vehicles = db_get_vehicles()

    opt_req = OptimizationRequest()

    # 1. Compute pristine baseline
    baseline_result = solve_allocation_lp(base_warehouses, base_centers, base_roads, opt_req)

    # 2. Compute scenario
    scen_centers, scen_warehouses, scen_roads = apply_scenario_modifications(
        base_centers, base_warehouses, base_roads, req
    )
    scenario_result = solve_allocation_lp(scen_warehouses, scen_centers, scen_roads, opt_req)

    # 3. Compare side-by-side
    comparison = compare_scenarios(baseline_result, scenario_result, req.scenario_id, req.custom_name)

    _CACHED_STATE["last_scenario_comparison"] = comparison
    _CACHED_STATE["active_scenario_id"] = req.scenario_id
    return comparison

@router.get("/scenarios/compare", response_model=ScenarioComparisonResponse)
def get_scenario_comparison(scenario_id: str = "B"):
    req = ScenarioPresetRequest(scenario_id=scenario_id)
    return run_scenario(req)

# 10. Dashboard Overview
@router.get("/dashboard", response_model=DashboardOverviewResponse)
def get_dashboard_overview():
    centers = db_get_relief_centers()
    warehouses = db_get_warehouses()
    vehicles = db_get_vehicles()
    roads = db_get_road_segments()

    opt_res = _CACHED_STATE["last_opt_result"]
    deliv_res = _CACHED_STATE["last_delivery_plan"]

    if not opt_res or not deliv_res:
        opt_res, deliv_res = get_or_run_baseline_opt()

    total_pop = sum(c.affected_population for c in centers)
    critical_centers = sum(1 for c in centers if c.urgency_level == "Critical")
    inacc_centers = sum(1 for c in centers if not c.is_accessible)

    tot_food_stock = sum(w.food_stock_kg for w in warehouses)
    tot_water_stock = sum(w.water_stock_l for w in warehouses)
    tot_med_stock = sum(w.medical_kits for w in warehouses)

    tot_demand_weight = opt_res.total_food_demand_kg + opt_res.total_water_demand_l + (opt_res.total_medical_demand_kits * 2.5)

    # Alerts
    alerts = []
    if inacc_centers > 0:
        inacc_names = [c.name for c in centers if not c.is_accessible]
        alerts.append({
            "severity": "CRITICAL",
            "type": "ACCESSIBILITY",
            "title": f"{inacc_centers} Relief Center(s) Inaccessible",
            "message": f"Ground transport route blocked for: {', '.join(inacc_names)}. Specialized transport required."
        })
    if opt_res.unmet_demand_weight_kg > 0:
        alerts.append({
            "severity": "WARNING",
            "type": "SHORTAGE",
            "title": f"Regional Supply Deficit: {opt_res.unmet_demand_weight_kg:,.0f} kg",
            "message": f"Inventory insufficient to fulfill 100% of demand across all centers. Rationing in effect."
        })
    urgent_med = sum(c.medical_emergency_count for c in centers)
    if urgent_med > 0:
        alerts.append({
            "severity": "INFO",
            "type": "MEDICAL",
            "title": f"{urgent_med} Acute Medical Casualties",
            "message": "Trauma stabilization kits prioritized by optimization engine."
        })

    # Supply category summary
    supply_category_summary = [
        {
            "category": "Food Rations (kg)",
            "demanded": opt_res.total_food_demand_kg,
            "allocated": opt_res.total_food_allocated_kg,
            "inventory": tot_food_stock,
            "fulfillment_pct": opt_res.overall_food_fulfillment_pct
        },
        {
            "category": "Drinking Water (L)",
            "demanded": opt_res.total_water_demand_l,
            "allocated": opt_res.total_water_allocated_l,
            "inventory": tot_water_stock,
            "fulfillment_pct": opt_res.overall_water_fulfillment_pct
        },
        {
            "category": "Medical Kits (units)",
            "demanded": opt_res.total_medical_demand_kits,
            "allocated": opt_res.total_medical_allocated_kits,
            "inventory": tot_med_stock,
            "fulfillment_pct": opt_res.overall_medical_fulfillment_pct
        }
    ]

    # Urgency distribution
    urgency_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for c in centers:
        urgency_counts[c.urgency_level] = urgency_counts.get(c.urgency_level, 0) + 1
    urgency_dist = [{"level": k, "count": v} for k, v in urgency_counts.items()]

    # Delivery summary
    deliv_summary = {
        "total_trips": deliv_res.total_trips,
        "total_distance_km": deliv_res.total_distance_km,
        "total_cost": deliv_res.total_cost,
        "total_cargo_weight_kg": deliv_res.total_cargo_weight_kg,
        "active_vehicles": len(deliv_res.vehicle_utilization_summary)
    }

    return DashboardOverviewResponse(
        total_affected_population=total_pop,
        total_relief_centers=len(centers),
        critical_centers_count=critical_centers,
        inaccessible_centers_count=inacc_centers,
        total_warehouses=len(warehouses),
        total_food_inventory_kg=tot_food_stock,
        total_water_inventory_l=tot_water_stock,
        total_medical_inventory_kits=tot_med_stock,
        total_estimated_demand_weight_kg=round(tot_demand_weight, 1),
        demand_fulfilled_pct=opt_res.overall_fulfillment_pct,
        unmet_demand_weight_kg=opt_res.unmet_demand_weight_kg,
        planned_deliveries_count=deliv_res.total_trips,
        total_estimated_transport_cost=opt_res.total_transport_cost,
        total_estimated_distance_km=opt_res.total_transport_distance_km,
        fairness_gini_coefficient=opt_res.fairness_gini_coefficient,
        alerts=alerts,
        supply_category_summary=supply_category_summary,
        urgency_distribution=urgency_dist,
        delivery_status_summary=deliv_summary
    )

# 11. Reports
@router.post("/reports/generate")
def generate_report():
    centers = db_get_relief_centers()
    warehouses = db_get_warehouses()
    vehicles = db_get_vehicles()
    roads = db_get_road_segments()

    opt_res = _CACHED_STATE["last_opt_result"]
    deliv_res = _CACHED_STATE["last_delivery_plan"]
    if not opt_res or not deliv_res:
        opt_res, deliv_res = get_or_run_baseline_opt()

    scen_comp = _CACHED_STATE["last_scenario_comparison"]
    md = generate_report_markdown(centers, warehouses, vehicles, opt_res, deliv_res.trips, scen_comp)
    return {
        "markdown": md,
        "generated_at": datetime.now().isoformat(),
        "sections_count": 16,
        "active_scenario": _CACHED_STATE.get("active_scenario_id", "A")
    }

@router.get("/reports/download/pdf")
def download_report_pdf():
    centers = db_get_relief_centers()
    warehouses = db_get_warehouses()
    vehicles = db_get_vehicles()

    opt_res = _CACHED_STATE["last_opt_result"]
    deliv_res = _CACHED_STATE["last_delivery_plan"]
    if not opt_res or not deliv_res:
        opt_res, deliv_res = get_or_run_baseline_opt()

    scen_comp = _CACHED_STATE["last_scenario_comparison"]
    pdf_bytes = generate_report_pdf(centers, warehouses, vehicles, opt_res, deliv_res.trips, scen_comp)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ReliefRoute_Emergency_Logistics_Report.pdf"}
    )

# 12. CSV Import / Export
@router.get("/export/csv/template/{entity}")
def download_csv_template(entity: str):
    if entity == "relief-centers":
        content = get_relief_centers_csv_template()
        filename = "relief_centers_template.csv"
    elif entity == "warehouses":
        content = get_warehouses_csv_template()
        filename = "warehouses_template.csv"
    else:
        raise HTTPException(status_code=400, detail="Unknown entity template")

    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/import/csv", response_model=CSVImportResponse)
async def import_csv_file(file: UploadFile = File(...), entity_type: str = Query(..., description="relief-centers or warehouses")):
    content = (await file.read()).decode("utf-8")
    if entity_type == "relief-centers":
        valid_centers, warnings, errors = parse_relief_centers_csv(content)
        if errors:
            return CSVImportResponse(success=False, imported_count=0, warnings=warnings, errors=errors, sample_records=[])
        for c in valid_centers:
            db_save_relief_center(c)
        _CACHED_STATE["last_opt_result"] = None
        return CSVImportResponse(
            success=True,
            imported_count=len(valid_centers),
            warnings=warnings,
            errors=[],
            sample_records=[c.model_dump() for c in valid_centers[:3]]
        )
    elif entity_type == "warehouses":
        valid_wh, warnings, errors = parse_warehouses_csv(content)
        if errors:
            return CSVImportResponse(success=False, imported_count=0, warnings=warnings, errors=errors, sample_records=[])
        for w in valid_wh:
            db_save_warehouse(w)
        _CACHED_STATE["last_opt_result"] = None
        return CSVImportResponse(
            success=True,
            imported_count=len(valid_wh),
            warnings=warnings,
            errors=[],
            sample_records=[w.model_dump() for w in valid_wh[:3]]
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid entity_type. Choose 'relief-centers' or 'warehouses'.")

@router.get("/export/csv/allocations")
def export_allocations():
    opt_res = _CACHED_STATE["last_opt_result"]
    if not opt_res:
        opt_res, _ = get_or_run_baseline_opt()
    csv_str = export_allocations_csv(opt_res.allocations)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ReliefRoute_Allocations.csv"}
    )

@router.get("/export/csv/deliveries")
def export_deliveries():
    deliv_res = _CACHED_STATE["last_delivery_plan"]
    if not deliv_res:
        _, deliv_res = get_or_run_baseline_opt()
    csv_str = export_deliveries_csv(deliv_res.trips)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ReliefRoute_Delivery_Plan.csv"}
    )

@router.get("/export/csv/scenario-comparison")
def export_scenarios():
    scen_comp = _CACHED_STATE["last_scenario_comparison"]
    if not scen_comp:
        scen_comp = get_scenario_comparison("B")
    csv_str = export_scenario_comparison_csv(scen_comp.center_deltas)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ReliefRoute_Scenario_Comparison.csv"}
    )
