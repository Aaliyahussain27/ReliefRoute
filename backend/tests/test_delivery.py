import pytest
from app.models.api_models import OptimizationRequest
from app.services.sample_data import (
    get_default_relief_centers, get_default_warehouses,
    get_default_vehicles, get_default_road_network
)
from app.services.optimization_engine import solve_allocation_lp
from app.services.delivery_planner import generate_delivery_plan

def test_delivery_capacity_and_feasibility():
    warehouses = get_default_warehouses()
    centers = get_default_relief_centers()
    roads = get_default_road_network()
    vehicles = get_default_vehicles()

    opt_res = solve_allocation_lp(warehouses, centers, roads, OptimizationRequest())
    plan = generate_delivery_plan(opt_res.allocations, vehicles, centers, warehouses, roads)

    assert plan.total_trips > 0
    assert plan.total_cargo_weight_kg > 0

    # Ensure no trip exceeds vehicle capacity
    for trip in plan.trips:
        assert trip.cargo_weight_kg <= trip.payload_capacity_kg + 0.1
        assert trip.distance_km > 0
        assert trip.transport_cost > 0
        assert trip.utilization_pct <= 100.0

    # Ensure inaccessible center is noted in unserved
    assert "Delta Island Fisherfolk Compound" in plan.inaccessible_centers_unserved
