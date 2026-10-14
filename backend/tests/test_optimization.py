import pytest
from app.models.api_models import OptimizationRequest
from app.services.sample_data import (
    get_default_relief_centers, get_default_warehouses, get_default_road_network
)
from app.services.optimization_engine import solve_allocation_lp, compute_gini

def test_inventory_conservation():
    warehouses = get_default_warehouses()
    centers = get_default_relief_centers()
    roads = get_default_road_network()
    req = OptimizationRequest()

    res = solve_allocation_lp(warehouses, centers, roads, req)

    assert res.status in ["OPTIMAL", "FEASIBLE", "FALLBACK_HEURISTIC"]
    assert len(res.constraint_violations) == 0

    # Ensure total allocated per warehouse does not exceed warehouse stock
    wh_dict = {w.id: w for w in warehouses}
    for w_id, w in wh_dict.items():
        food_sum = sum(a.food_kg for a in res.allocations if a.warehouse_id == w_id)
        water_sum = sum(a.water_l for a in res.allocations if a.warehouse_id == w_id)
        med_sum = sum(a.medical_kits for a in res.allocations if a.warehouse_id == w_id)

        assert food_sum <= w.food_stock_kg + 0.1
        assert water_sum <= w.water_stock_l + 0.1
        assert med_sum <= w.medical_kits + 0.1

def test_inaccessible_center_gets_zero():
    warehouses = get_default_warehouses()
    centers = get_default_relief_centers()
    roads = get_default_road_network()
    req = OptimizationRequest()

    res = solve_allocation_lp(warehouses, centers, roads, req)

    # In default data, RC-05 is inaccessible
    rc05_summary = next(s for s in res.center_summaries if s.center_id == "RC-05")
    assert rc05_summary.is_accessible is False
    assert rc05_summary.overall_fulfillment_pct == 0.0
    assert rc05_summary.food_allocated_kg == 0.0
    assert rc05_summary.water_allocated_l == 0.0
    assert rc05_summary.medical_allocated_kits == 0.0

def test_urgency_prioritization_and_fairness():
    warehouses = get_default_warehouses()
    centers = get_default_relief_centers()
    roads = get_default_road_network()
    req = OptimizationRequest()

    res = solve_allocation_lp(warehouses, centers, roads, req)

    # Critical centers with open access (like RC-03) should receive high fulfillment
    rc03 = next(s for s in res.center_summaries if s.center_id == "RC-03")
    assert rc03.overall_fulfillment_pct >= 80.0

    # Fairness gini must be valid range [0, 1]
    assert 0.0 <= res.fairness_gini_coefficient <= 1.0
