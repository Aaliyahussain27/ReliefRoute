import pytest
from app.models.domain import ReliefCenter
from app.models.api_models import DemandEstimateRequest
from app.services.demand_engine import estimate_center_demand, estimate_total_demand

def test_demand_calculation_basic():
    center = ReliefCenter(
        id="TEST-01",
        name="Test Shelter",
        lat=14.5,
        lng=121.0,
        affected_population=1000,
        vulnerability_score=0.5,
        urgency_level="High",
        medical_emergency_count=10,
        is_accessible=True,
        local_food_stock_kg=0.0,
        local_water_stock_l=0.0,
        local_medical_kits=0.0
    )
    req = DemandEstimateRequest(
        planning_horizon_days=3.0,
        food_kg_per_person_day=0.5,
        water_l_per_person_day=3.0,
        medical_kits_per_1000=2.0,
        emergency_kits_per_case=1.0,
        include_local_stocks=True
    )
    res = estimate_center_demand(center, req)

    # Vulnerability multiplier = 1 + (0.10 * 0.5) = 1.05
    # Gross food = 1000 * 0.5 * 3 * 1.05 = 1575 kg
    assert res.food_demand_kg == 1575.0
    # Gross water = 1000 * 3.0 * 3 * 1.05 = 9450 L
    assert res.water_demand_l == 9450.0

    # Baseline med: (1000/1000) * 2.0 * (3/3) * (1 + 0.2*0.5) = 2.0 * 1.1 = 2.2
    # Emergency med: 10 * 1.0 = 10.0
    # Total med = 12.2 kits
    assert res.baseline_medical_kits == 2.2
    assert res.emergency_medical_kits == 10.0
    assert res.total_medical_kits == 12.2

def test_demand_local_stock_offset_and_non_negative():
    center = ReliefCenter(
        id="TEST-02",
        name="Stocked Shelter",
        lat=14.5,
        lng=121.0,
        affected_population=100,
        vulnerability_score=0.0,
        urgency_level="Low",
        medical_emergency_count=0,
        is_accessible=True,
        local_food_stock_kg=5000.0,  # massive local surplus
        local_water_stock_l=20000.0,
        local_medical_kits=50.0
    )
    req = DemandEstimateRequest(planning_horizon_days=1.0)
    res = estimate_center_demand(center, req)

    assert res.food_demand_kg == 0.0
    assert res.water_demand_l == 0.0
    assert res.total_medical_kits == 0.0
