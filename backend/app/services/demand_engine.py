"""
Demand Estimation Engine for ReliefRoute.
Calculates transparent, configurable food, drinking water, and medical demand
aligned with Sphere Standards and humanitarian emergency guidelines.
"""

from typing import List, Dict, Any
from ..models.domain import ReliefCenter, DemandCalculation, DemandSummary
from ..models.api_models import DemandEstimateRequest

def estimate_center_demand(
    center: ReliefCenter,
    params: DemandEstimateRequest
) -> DemandCalculation:
    """
    Computes transparent food, water, and medical demand for a single relief center.
    Baseline medical is strictly isolated from acute emergency casualties to prevent double counting.
    """
    pop = center.affected_population
    horizon = params.planning_horizon_days
    vuln = center.vulnerability_score

    # Food Demand calculation
    # Base: pop * food_per_person_day * horizon
    # Vulnerability modifier: higher vulnerability (children, elderly) requires slight nutrient buffer (+10% * vuln)
    food_vuln_mult = 1.0 + (0.10 * vuln)
    gross_food = round(pop * params.food_kg_per_person_day * horizon * food_vuln_mult, 2)
    local_food = center.local_food_stock_kg if params.include_local_stocks else 0.0
    net_food = max(0.0, round(gross_food - local_food, 2))

    # Water Demand calculation
    # Base: pop * water_l_per_person_day * horizon
    # Vulnerability modifier: higher dehydration risk in vulnerable demographic (+10% * vuln)
    water_vuln_mult = 1.0 + (0.10 * vuln)
    gross_water = round(pop * params.water_l_per_person_day * horizon * water_vuln_mult, 2)
    local_water = center.local_water_stock_l if params.include_local_stocks else 0.0
    net_water = max(0.0, round(gross_water - local_water, 2))

    # Medical Demand calculation
    # 1. Baseline Primary Medical Kits: standard routine chronic care / primary first aid
    # Scaled to horizon relative to standard 3-day triage cycle
    horizon_factor = max(0.5, horizon / 3.0)
    baseline_kits = round((pop / 1000.0) * params.medical_kits_per_1000 * horizon_factor * (1.0 + 0.20 * vuln), 2)

    # 2. Acute Emergency Medical Kits: targeted to verified acute casualties / trauma cases
    emergency_kits = round(center.medical_emergency_count * params.emergency_kits_per_case, 2)

    gross_medical = round(baseline_kits + emergency_kits, 2)
    local_med = center.local_medical_kits if params.include_local_stocks else 0.0
    net_medical = max(0.0, round(gross_medical - local_med, 2))

    assumptions = (
        f"Horizon: {horizon}d | Food: {params.food_kg_per_person_day}kg/p/d (vuln x{food_vuln_mult:.2f}) | "
        f"Water: {params.water_l_per_person_day}L/p/d (vuln x{water_vuln_mult:.2f}) | "
        f"Baseline Med: {baseline_kits:.1f} kits ({params.medical_kits_per_1000}/k pop) + "
        f"Emergency Trauma: {emergency_kits:.1f} kits ({center.medical_emergency_count} cases). "
        "Planning assumptions requiring validation by qualified humanitarian personnel."
    )

    return DemandCalculation(
        center_id=center.id,
        center_name=center.name,
        affected_population=pop,
        urgency_level=center.urgency_level,
        vulnerability_score=vuln,
        planning_horizon_days=horizon,
        food_demand_kg=net_food,
        water_demand_l=net_water,
        baseline_medical_kits=baseline_kits,
        emergency_medical_kits=emergency_kits,
        total_medical_kits=net_medical,
        gross_food_kg=gross_food,
        local_food_offset_kg=local_food,
        gross_water_l=gross_water,
        local_water_offset_l=local_water,
        gross_medical_kits=gross_medical,
        local_medical_offset_kits=local_med,
        assumptions_note=assumptions
    )

def estimate_total_demand(
    centers: List[ReliefCenter],
    params: DemandEstimateRequest
) -> DemandSummary:
    """
    Aggregates demand across all relief centers.
    """
    calculations = [estimate_center_demand(c, params) for c in centers]

    total_pop = sum(c.affected_population for c in centers)
    total_food = round(sum(calc.food_demand_kg for calc in calculations), 2)
    total_water = round(sum(calc.water_demand_l for calc in calculations), 2)
    total_med = round(sum(calc.total_medical_kits for calc in calculations), 2)

    # Cargo weight: 1kg food = 1kg, 1L water = 1kg, 1 medical kit ~ 2.5kg
    total_weight = round(total_food + total_water + (total_med * 2.5), 2)
    critical_count = sum(1 for c in centers if c.urgency_level == "Critical")

    return DemandSummary(
        planning_horizon_days=params.planning_horizon_days,
        total_affected_population=total_pop,
        total_food_demand_kg=total_food,
        total_water_demand_l=total_water,
        total_medical_kits_demand=total_med,
        total_gross_weight_kg=total_weight,
        centers_count=len(centers),
        critical_centers_count=critical_count,
        center_demands=calculations,
        parameters_used=params.model_dump()
    )
