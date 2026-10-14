import pytest
from app.models.api_models import ScenarioPresetRequest, OptimizationRequest
from app.services.sample_data import (
    get_default_relief_centers, get_default_warehouses, get_default_road_network
)
from app.services.scenario_engine import (
    apply_scenario_modifications, compare_scenarios
)
from app.services.optimization_engine import solve_allocation_lp

def test_scenario_isolation_preserves_baseline():
    base_centers = get_default_relief_centers()
    base_warehouses = get_default_warehouses()
    base_roads = get_default_road_network()

    orig_wh01_food = base_warehouses[0].food_stock_kg
    orig_rc03_med = base_centers[2].medical_emergency_count

    # Run Scenario C (Shortage)
    req = ScenarioPresetRequest(scenario_id="C")
    scen_centers, scen_warehouses, scen_roads = apply_scenario_modifications(
        base_centers, base_warehouses, base_roads, req
    )

    # Scenario warehouses modified
    assert scen_warehouses[0].food_stock_kg < orig_wh01_food
    # Baseline warehouses completely pristine
    assert base_warehouses[0].food_stock_kg == orig_wh01_food
    assert base_centers[2].medical_emergency_count == orig_rc03_med

def test_scenario_comparison_metrics():
    base_centers = get_default_relief_centers()
    base_warehouses = get_default_warehouses()
    base_roads = get_default_road_network()
    opt_req = OptimizationRequest()

    base_res = solve_allocation_lp(base_warehouses, base_centers, base_roads, opt_req)

    # Scenario B (Road Closure)
    scen_centers, scen_warehouses, scen_roads = apply_scenario_modifications(
        base_centers, base_warehouses, base_roads, ScenarioPresetRequest(scenario_id="B")
    )
    scen_res = solve_allocation_lp(scen_warehouses, scen_centers, scen_roads, opt_req)

    comp = compare_scenarios(base_res, scen_res, "B")
    assert comp.scenario_id == "B"
    assert len(comp.key_metrics) > 0
    assert len(comp.center_deltas) == len(base_centers)
    assert len(comp.operational_recommendations) > 0
