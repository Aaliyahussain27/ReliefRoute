"""
Scenario Simulation and Comparative Analysis Engine for ReliefRoute.
Executes disaster scenario experiments (Road Closures, Supply Shortages, Medical Surges, Combined Disasters)
and computes rigorous side-by-side delta metrics against the pristine baseline.
"""

from typing import List, Dict, Any, Tuple
import copy
from ..models.domain import ReliefCenter, Warehouse, Vehicle, RoadSegment, OptimizationResult
from ..models.api_models import (
    ScenarioPresetRequest, ScenarioComparisonResponse,
    ScenarioComparisonMetric, CenterScenarioDelta, OptimizationRequest
)
from .optimization_engine import solve_allocation_lp

SCENARIO_PRESETS_METADATA = {
    "A": {
        "name": "Scenario A: Normal Baseline Operations",
        "description": "Baseline post-disaster state: primary arterial corridors open, standard emergency depot stocks available, baseline humanitarian demand."
    },
    "B": {
        "name": "Scenario B: Major Arterial Corridor & Bridge Closure",
        "description": "Severe seismic aftershock destroys the Northern Coastal Overpass and blocks WH-01 direct transit to RC-02 and RC-03. All eastern deliveries forced onto high-delay detour passes."
    },
    "C": {
        "name": "Scenario C: Critical Food & Water Supply Chain Deficit",
        "description": "Port supply shipments delayed by coastal storm. Central Logistics Hub (WH-01) stock drops by 55%, Eastern Depot (WH-02) drops by 45%."
    },
    "D": {
        "name": "Scenario D: Acute Waterborne Disease & Trauma Surge",
        "description": "Contaminated floodwaters trigger cholera and trauma outbreak. Relief centers RC-04 and RC-07 experience an acute surge (+75 and +90 urgent medical casualties) and escalate to Critical urgency."
    },
    "E": {
        "name": "Scenario E: Combined Compound Disaster Catastrophe",
        "description": "Worst-case compound disaster: Bridge collapse cuts off primary logistics artery, regional food/water reserves slashed by 50%, and multi-center medical emergency surge unfolds simultaneously."
    }
}

def apply_scenario_modifications(
    baseline_centers: List[ReliefCenter],
    baseline_warehouses: List[Warehouse],
    baseline_roads: List[RoadSegment],
    req: ScenarioPresetRequest
) -> Tuple[List[ReliefCenter], List[Warehouse], List[RoadSegment]]:
    """
    Applies scenario modifications to cloned copies of the baseline data.
    Preserves pristine baseline state completely.
    """
    centers = [copy.deepcopy(c) for c in baseline_centers]
    warehouses = [copy.deepcopy(w) for w in baseline_warehouses]
    roads = [copy.deepcopy(r) for r in baseline_roads]

    scen_id = req.scenario_id.upper()

    if scen_id == "B" or (req.road_closures and len(req.road_closures) > 0):
        # Road Closure scenario: Sever key segments
        for seg in roads:
            if (seg.from_id == "WH-01" and seg.to_id in ["RC-02", "RC-03"]) or \
               (seg.from_id == "WH-02" and seg.to_id == "RC-03"):
                seg.is_accessible = False
                seg.road_status = "Flooded / Bridge Out"
                seg.risk_delay_score = 5.0
                seg.notes = "Overpass collapsed following structural fault."

    elif scen_id == "C" or (req.warehouse_stock_multiplier and len(req.warehouse_stock_multiplier) > 0):
        # Supply Shortage scenario
        for w in warehouses:
            if w.id == "WH-01":
                w.food_stock_kg = round(w.food_stock_kg * 0.45, 1)
                w.water_stock_l = round(w.water_stock_l * 0.45, 1)
                w.medical_kits = round(w.medical_kits * 0.50, 1)
            elif w.id == "WH-02":
                w.food_stock_kg = round(w.food_stock_kg * 0.55, 1)
                w.water_stock_l = round(w.water_stock_l * 0.55, 1)

    elif scen_id == "D" or (req.medical_emergency_surge and len(req.medical_emergency_surge) > 0):
        # Urgent Medical Outbreak surge
        for c in centers:
            if c.id == "RC-04":
                c.urgency_level = "Critical"
                c.medical_emergency_count += 65
                c.vulnerability_score = min(1.0, c.vulnerability_score + 0.35)
                c.road_closure_notes += " [OUTBREAK ZONE: Immediate IV fluids and antibiotics needed]"
            elif c.id == "RC-07":
                c.urgency_level = "Critical"
                c.medical_emergency_count += 70
                c.vulnerability_score = min(1.0, c.vulnerability_score + 0.30)
                c.road_closure_notes += " [TRAUMA SURGE: Mass casualty triage operational]"

    elif scen_id == "E":
        # Compound Disaster
        # 1. Road Closures
        for seg in roads:
            if seg.from_id == "WH-01" and seg.to_id in ["RC-02", "RC-03"]:
                seg.is_accessible = False
                seg.road_status = "Flooded / Bridge Out"
                seg.notes = "Compound collapse: Road impassable."
        # 2. Stock Cut
        for w in warehouses:
            w.food_stock_kg = round(w.food_stock_kg * 0.50, 1)
            w.water_stock_l = round(w.water_stock_l * 0.50, 1)
            w.medical_kits = round(w.medical_kits * 0.60, 1)
        # 3. Medical Surge
        for c in centers:
            if c.id in ["RC-03", "RC-04", "RC-07"]:
                c.medical_emergency_count += 40
                c.urgency_level = "Critical"

    # Custom user overrides if provided
    if req.warehouse_stock_multiplier:
        for w in warehouses:
            if w.id in req.warehouse_stock_multiplier:
                mult = req.warehouse_stock_multiplier[w.id]
                w.food_stock_kg = round(w.food_stock_kg * mult, 1)
                w.water_stock_l = round(w.water_stock_l * mult, 1)
                w.medical_kits = round(w.medical_kits * mult, 1)

    if req.medical_emergency_surge:
        for c in centers:
            if c.id in req.medical_emergency_surge:
                c.medical_emergency_count += req.medical_emergency_surge[c.id]
                c.urgency_level = "Critical"

    return centers, warehouses, roads

def compare_scenarios(
    baseline_result: OptimizationResult,
    scenario_result: OptimizationResult,
    scenario_id: str,
    custom_name: str = None
) -> ScenarioComparisonResponse:
    """
    Computes rigorous side-by-side deltas between baseline and scenario results.
    """
    meta = SCENARIO_PRESETS_METADATA.get(scenario_id.upper(), {
        "name": custom_name or f"Scenario {scenario_id}",
        "description": "User-defined disaster scenario simulation."
    })

    # 1. Key Metrics Comparison
    metrics: List[ScenarioComparisonMetric] = []

    def make_metric(name: str, base_val: float, scen_val: float, unit: str, higher_is_better: bool = True):
        delta = round(scen_val - base_val, 2)
        pct = round((delta / base_val * 100.0), 1) if base_val != 0 else 0.0
        favorable = (delta >= 0) if higher_is_better else (delta <= 0)
        return ScenarioComparisonMetric(
            metric_name=name,
            baseline_value=round(base_val, 2),
            scenario_value=round(scen_val, 2),
            delta_value=delta,
            delta_pct=pct,
            unit=unit,
            is_favorable=favorable
        )

    metrics.append(make_metric("Overall Demand Fulfillment", baseline_result.overall_fulfillment_pct, scenario_result.overall_fulfillment_pct, "%", True))
    metrics.append(make_metric("Food Fulfillment", baseline_result.overall_food_fulfillment_pct, scenario_result.overall_food_fulfillment_pct, "%", True))
    metrics.append(make_metric("Drinking Water Fulfillment", baseline_result.overall_water_fulfillment_pct, scenario_result.overall_water_fulfillment_pct, "%", True))
    metrics.append(make_metric("Medical Kits Fulfillment", baseline_result.overall_medical_fulfillment_pct, scenario_result.overall_medical_fulfillment_pct, "%", True))
    metrics.append(make_metric("Unmet Critical Demand Centers", baseline_result.unmet_critical_centers, scenario_result.unmet_critical_centers, "centers", False))
    metrics.append(make_metric("Total Unmet Deficit Cargo", baseline_result.unmet_demand_weight_kg, scenario_result.unmet_demand_weight_kg, "kg", False))
    metrics.append(make_metric("Total Fleet Transit Distance", baseline_result.total_transport_distance_km, scenario_result.total_transport_distance_km, "km", False))
    metrics.append(make_metric("Estimated Total Logistics Cost", baseline_result.total_transport_cost, scenario_result.total_transport_cost, "$", False))
    metrics.append(make_metric("Distribution Equity (Gini Index)", baseline_result.fairness_gini_coefficient, scenario_result.fairness_gini_coefficient, "Gini", False))

    # 2. Center Deltas
    base_summaries = {s.center_id: s for s in baseline_result.center_summaries}
    center_deltas: List[CenterScenarioDelta] = []

    for s_scen in scenario_result.center_summaries:
        s_base = base_summaries.get(s_scen.center_id)
        if not s_base:
            continue

        base_pct = s_base.overall_fulfillment_pct
        scen_pct = s_scen.overall_fulfillment_pct
        delta_pct = round(scen_pct - base_pct, 1)

        base_unmet = s_base.food_shortage_kg + s_base.water_shortage_l + (s_base.medical_shortage_kits * 2.5)
        scen_unmet = s_scen.food_shortage_kg + s_scen.water_shortage_l + (s_scen.medical_shortage_kits * 2.5)

        if not s_scen.is_accessible:
            status = "Cut Off"
            reason = "Center cut off: Road network segment blocked or impassable for relief trucks."
        elif delta_pct > 2.0:
            status = "Improved"
            reason = f"Allocated +{delta_pct}% more supplies due to heightened urgency or rerouted surplus."
        elif delta_pct < -2.0:
            status = "Degraded"
            reason = f"Fulfillment dropped {delta_pct}% due to supply stock depletion or rerouting to higher-urgency zones."
        else:
            status = "Unchanged"
            reason = "Fulfillment remained stable with balanced supply continuity."

        center_deltas.append(CenterScenarioDelta(
            center_id=s_scen.center_id,
            center_name=s_scen.center_name,
            baseline_fulfillment_pct=base_pct,
            scenario_fulfillment_pct=scen_pct,
            delta_fulfillment_pct=delta_pct,
            baseline_unmet_kg=round(base_unmet, 1),
            scenario_unmet_kg=round(scen_unmet, 1),
            status_change=status,
            primary_reason=reason
        ))

    # 3. Trade-off Summary & Operational Recommendations
    fulfillment_delta = round(scenario_result.overall_fulfillment_pct - baseline_result.overall_fulfillment_pct, 1)
    cost_delta = round(scenario_result.total_transport_cost - baseline_result.total_transport_cost, 2)

    trade_off = (
        f"Under {meta['name']}, regional fulfillment shifted by {fulfillment_delta:+.1f} percentage points, "
        f"and total fleet dispatch cost shifted by ${cost_delta:+,.2f}. "
    )
    if scenario_id.upper() in ["B", "E"]:
        trade_off += "Road closures necessitated circuitous detours, increasing per-ton-kilometer transport expenditure while leaving cut-off pockets reliant on secondary logistics."
    elif scenario_id.upper() in ["C"]:
        trade_off += "Depot inventory depletion forced strict rationing, severely affecting lower-urgency population centers to protect critical survival minimums."
    elif scenario_id.upper() in ["D"]:
        trade_off += "Emergency medical surge successfully diverted trauma kits to active hotspots, demonstrating responsive agility at the expense of non-urgent buffer reserves."

    recommendations = [
        "Pre-position secondary buffer stocks at Eastern Reserve Depot (WH-02) to mitigate coastal corridor vulnerability.",
        "Authorize amphibious all-terrain vehicles or rotary airlift for centers isolated by flood surges.",
        "Maintain the humanitarian minimum-coverage constraint (20%) to avoid complete deprivation of peripheral shelters.",
        "Request inter-agency mutual aid for specialized pediatric and trauma kits if outbreak trends continue."
    ]

    return ScenarioComparisonResponse(
        scenario_id=scenario_id.upper(),
        scenario_name=meta["name"],
        scenario_description=meta["description"],
        key_metrics=metrics,
        center_deltas=center_deltas,
        trade_off_summary=trade_off,
        operational_recommendations=recommendations,
        baseline_result=baseline_result,
        scenario_result=scenario_result
    )
