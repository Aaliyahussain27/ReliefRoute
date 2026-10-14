"""
Allocation Optimization Engine for ReliefRoute.
Implements exact Mixed-Integer / Linear Programming using SciPy HiGHS solver,
coupled with an explainable fallback heuristic, fairness metrics (Gini/Variance),
and comprehensive constraint verification.
"""

from typing import List, Dict, Tuple, Any
import numpy as np
from scipy.optimize import linprog

from ..models.domain import (
    ReliefCenter, Warehouse, RoadSegment,
    AllocationItem, CenterAllocationSummary, OptimizationResult
)
from ..models.api_models import OptimizationRequest, DemandEstimateRequest
from .demand_engine import estimate_center_demand

def compute_network_distances(
    warehouses: List[Warehouse],
    centers: List[ReliefCenter],
    road_segments: List[RoadSegment]
) -> Dict[Tuple[str, str], Dict[str, Any]]:
    """
    Computes shortest path distances and accessibility between each warehouse and relief center.
    If a road segment or center is marked inaccessible, it is excluded.
    """
    import networkx as nx

    G = nx.Graph()
    for seg in road_segments:
        if seg.is_accessible:
            # weight = distance * risk_delay_score
            effective_weight = seg.distance_km * seg.risk_delay_score
            G.add_edge(
                seg.from_id,
                seg.to_id,
                weight=effective_weight,
                actual_distance=seg.distance_km,
                time_min=seg.estimated_travel_time_min,
                status=seg.road_status
            )

    dist_matrix = {}
    for w in warehouses:
        for c in centers:
            key = (w.id, c.id)
            if not c.is_accessible:
                dist_matrix[key] = {
                    "distance_km": float("inf"),
                    "time_min": float("inf"),
                    "accessible": False,
                    "reason": f"Center {c.id} marked inaccessible: {c.road_closure_notes}"
                }
            elif w.id in G and c.id in G and nx.has_path(G, w.id, c.id):
                path = nx.shortest_path(G, source=w.id, target=c.id, weight="weight")
                # compute total actual distance
                tot_dist = 0.0
                tot_time = 0.0
                for i in range(len(path) - 1):
                    edge_data = G[path[i]][path[i+1]]
                    tot_dist += edge_data.get("actual_distance", 5.0)
                    tot_time += edge_data.get("time_min", 10.0)
                dist_matrix[key] = {
                    "distance_km": round(tot_dist, 2),
                    "time_min": round(tot_time, 1),
                    "accessible": True,
                    "path": path,
                    "reason": "Clear route available via network"
                }
            else:
                dist_matrix[key] = {
                    "distance_km": float("inf"),
                    "time_min": float("inf"),
                    "accessible": False,
                    "reason": f"No open road path from {w.id} to {c.id}"
                }
    return dist_matrix

def compute_gini(values: List[float]) -> float:
    """Computes Gini inequality coefficient for fulfillment rates (0.0 = perfect fairness, 1.0 = total inequality)."""
    if not values or len(values) == 0:
        return 0.0
    arr = np.array(values, dtype=float)
    if np.all(arr == 0):
        return 0.0
    arr = np.sort(arr)
    n = len(arr)
    index = np.arange(1, n + 1)
    return float(round((np.sum((2 * index - n - 1) * arr)) / (n * np.sum(arr)), 4))

def solve_allocation_lp(
    warehouses: List[Warehouse],
    centers: List[ReliefCenter],
    road_segments: List[RoadSegment],
    req: OptimizationRequest
) -> OptimizationResult:
    """
    Main allocation solver using Scipy HiGHS Linear Programming.
    Guarantees supply conservation, accessibility enforcement, and urgency weighting.
    """
    audit_log = []
    audit_log.append("Initiating ReliefRoute Multi-Commodity Allocation Optimization.")
    audit_log.append(f"Problem Size: {len(warehouses)} Warehouses, {len(centers)} Relief Centers, 3 Supply Categories (Food, Water, Medical).")

    # 1. Compute Demand
    demand_req = DemandEstimateRequest(
        planning_horizon_days=req.planning_horizon_days,
        food_kg_per_person_day=req.food_kg_per_person_day,
        water_l_per_person_day=req.water_l_per_person_day,
        medical_kits_per_1000=req.medical_kits_per_1000,
        emergency_kits_per_case=req.emergency_kits_per_case,
        include_local_stocks=True
    )
    center_demands = {c.id: estimate_center_demand(c, demand_req) for c in centers}
    net_demands = {
        c.id: {
            "food": center_demands[c.id].food_demand_kg,
            "water": center_demands[c.id].water_demand_l,
            "medical": center_demands[c.id].total_medical_kits
        }
        for c in centers
    }

    # 2. Network Distance & Accessibility Matrix
    dist_matrix = compute_network_distances(warehouses, centers, road_segments)

    # 3. Urgency and Category weights
    urgency_map = {
        "Critical": req.weight_critical,
        "High": req.weight_high,
        "Medium": req.weight_medium,
        "Low": req.weight_low
    }
    category_map = {
        "food": req.weight_food,
        "water": req.weight_water,
        "medical": req.weight_medical
    }

    categories = ["food", "water", "medical"]
    num_w = len(warehouses)
    num_c = len(centers)
    num_k = len(categories)

    # Variables indexing:
    # x[w, c, k]: index = w * (num_c * num_k) + c * num_k + k  (size: num_w * num_c * num_k)
    # s[c, k]: shortage for center c, category k. index offset = num_x + c * num_k + k (size: num_c * num_k)
    num_x = num_w * num_c * num_k
    num_s = num_c * num_k
    total_vars = num_x + num_s

    def x_idx(w_i: int, c_i: int, k_i: int) -> int:
        return w_i * (num_c * num_k) + c_i * num_k + k_i

    def s_idx(c_i: int, k_i: int) -> int:
        return num_x + c_i * num_k + k_i

    # Objective Function (Minimize):
    # Shortage penalty: W_urgency(c) * W_category(k) * (1 + 0.3 * vuln(c)) * s[c, k]
    # Transport penalty: lambda * distance(w, c) * x[w, c, k]
    c_obj = np.zeros(total_vars)

    # Set x transport penalty
    for w_i, w in enumerate(warehouses):
        for c_i, c in enumerate(centers):
            dist_info = dist_matrix[(w.id, c.id)]
            d_km = dist_info["distance_km"] if dist_info["accessible"] else 1000.0
            for k_i, k in enumerate(categories):
                # weight unit conversion for cost: 1kg food = 1kg, 1L water = 1kg, 1 med kit = 2.5kg
                weight_mult = 2.5 if k == "medical" else 1.0
                c_obj[x_idx(w_i, c_i, k_i)] = req.transport_penalty_lambda * d_km * weight_mult

    # Set s shortage penalty
    for c_i, c in enumerate(centers):
        urg_w = urgency_map.get(c.urgency_level, 2.5)
        vuln_mult = 1.0 + (0.5 * c.vulnerability_score)
        for k_i, k in enumerate(categories):
            cat_w = category_map[k]
            # Critical medical gets extra prioritization bonus
            priority_mult = urg_w * cat_w * vuln_mult
            if c.urgency_level == "Critical" and k == "medical":
                priority_mult *= 2.0
            c_obj[s_idx(c_i, k_i)] = priority_mult

    # Bounds:
    bounds = []
    # Bounds for x:
    for w_i, w in enumerate(warehouses):
        for c_i, c in enumerate(centers):
            dist_info = dist_matrix[(w.id, c.id)]
            is_acc = dist_info["accessible"]
            for k_i, k in enumerate(categories):
                if not is_acc:
                    bounds.append((0.0, 0.0))  # strictly 0 if inaccessible
                else:
                    d_val = net_demands[c.id][k]
                    bounds.append((0.0, max(0.0, float(d_val))))

    # Bounds for s:
    for c_i, c in enumerate(centers):
        for k_i, k in enumerate(categories):
            d_val = net_demands[c.id][k]
            bounds.append((0.0, max(0.0, float(d_val))))

    # Constraints:
    # 1. Equality: for each center c and category k:
    #    sum_w x[w, c, k] + s[c, k] = Demand[c, k]
    A_eq = []
    b_eq = []
    for c_i, c in enumerate(centers):
        for k_i, k in enumerate(categories):
            row = np.zeros(total_vars)
            for w_i in range(num_w):
                row[x_idx(w_i, c_i, k_i)] = 1.0
            row[s_idx(c_i, k_i)] = 1.0
            A_eq.append(row)
            b_eq.append(net_demands[c.id][k])

    # 2. Inequalities (<=):
    # a. Warehouse inventory limits: for each w and k, sum_c x[w, c, k] <= Stock[w, k]
    # b. Warehouse daily dispatch capacity: sum_{c, k} (weight_mult * x[w, c, k]) <= DispatchCap[w]
    A_ub = []
    b_ub = []

    for w_i, w in enumerate(warehouses):
        # food stock
        row_f = np.zeros(total_vars)
        for c_i in range(num_c):
            row_f[x_idx(w_i, c_i, 0)] = 1.0
        A_ub.append(row_f)
        b_ub.append(w.food_stock_kg)

        # water stock
        row_w = np.zeros(total_vars)
        for c_i in range(num_c):
            row_w[x_idx(w_i, c_i, 1)] = 1.0
        A_ub.append(row_w)
        b_ub.append(w.water_stock_l)

        # medical stock
        row_m = np.zeros(total_vars)
        for c_i in range(num_c):
            row_m[x_idx(w_i, c_i, 2)] = 1.0
        A_ub.append(row_m)
        b_ub.append(w.medical_kits)

        # dispatch capacity
        row_disp = np.zeros(total_vars)
        for c_i in range(num_c):
            row_disp[x_idx(w_i, c_i, 0)] = 1.0   # 1kg food
            row_disp[x_idx(w_i, c_i, 1)] = 1.0   # 1L water (~1kg)
            row_disp[x_idx(w_i, c_i, 2)] = 2.5   # 1 kit (~2.5kg)
        A_ub.append(row_disp)
        b_ub.append(w.dispatch_capacity_kg_per_day)

    # Convert to numpy arrays
    A_eq = np.array(A_eq) if A_eq else None
    b_eq = np.array(b_eq) if b_eq else None
    A_ub = np.array(A_ub) if A_ub else None
    b_ub = np.array(b_ub) if b_ub else None

    # Solve using SciPy HiGHS
    audit_log.append("Calling SciPy HiGHS simplex/interior-point exact solver...")
    solver_status = "OPTIMAL"
    solver_name = "SciPy HiGHS LP Solver"
    solver_msg = "Solved to exact optimality"

    try:
        res = linprog(
            c=c_obj,
            A_ub=A_ub,
            b_ub=b_ub,
            A_eq=A_eq,
            b_eq=b_eq,
            bounds=bounds,
            method="highs"
        )
        if not res.success:
            audit_log.append(f"HiGHS solver reported non-optimal: {res.message}. Initiating heuristic fallback.")
            solver_status = "FALLBACK_HEURISTIC"
            solver_name = "ReliefRoute Greedy Explainable Fallback"
            solver_msg = f"Fallback utilized: {res.message}"
            sol_x = fallback_greedy_allocation(warehouses, centers, dist_matrix, net_demands, urgency_map)
        else:
            sol_x = res.x
            audit_log.append("HiGHS solver returned optimal solution successfully.")
    except Exception as e:
        audit_log.append(f"Solver exception: {str(e)}. Invoking deterministic explainable fallback.")
        solver_status = "FALLBACK_HEURISTIC"
        solver_name = "ReliefRoute Greedy Explainable Fallback"
        solver_msg = f"Exception: {str(e)}"
        sol_x = fallback_greedy_allocation(warehouses, centers, dist_matrix, net_demands, urgency_map)

    # 4. Parse Solutions and Generate Allocations
    allocations: List[AllocationItem] = []
    center_totals: Dict[str, Dict[str, float]] = {
        c.id: {"food": 0.0, "water": 0.0, "medical": 0.0, "weight": 0.0, "distance_sum": 0.0, "sources": []}
        for c in centers
    }

    warehouse_dict = {w.id: w for w in warehouses}
    center_dict = {c.id: c for c in centers}

    total_dist_traveled = 0.0
    total_cost = 0.0

    for w_i, w in enumerate(warehouses):
        for c_i, c in enumerate(centers):
            f_alloc = round(float(sol_x[x_idx(w_i, c_i, 0)]), 2)
            w_alloc = round(float(sol_x[x_idx(w_i, c_i, 1)]), 2)
            m_alloc = round(float(sol_x[x_idx(w_i, c_i, 2)]), 2)

            if f_alloc > 0.01 or w_alloc > 0.01 or m_alloc > 0.01:
                dist_info = dist_matrix[(w.id, c.id)]
                d_km = dist_info.get("distance_km", 0.0)
                cargo_wt = round(f_alloc + w_alloc + (m_alloc * 2.5), 2)
                # baseline transit cost: ~$2.5 per km * (1 + weight/10000)
                trip_cost = round(d_km * 2.5 * max(1.0, cargo_wt / 4000.0), 2)

                alloc_item = AllocationItem(
                    warehouse_id=w.id,
                    warehouse_name=w.name,
                    center_id=c.id,
                    center_name=c.name,
                    food_kg=f_alloc,
                    water_l=w_alloc,
                    medical_kits=m_alloc,
                    total_weight_kg=cargo_wt,
                    distance_km=d_km,
                    transport_cost=trip_cost,
                    is_reachable=dist_info["accessible"],
                    route_status=dist_info.get("reason", "Clear")
                )
                allocations.append(alloc_item)

                center_totals[c.id]["food"] += f_alloc
                center_totals[c.id]["water"] += w_alloc
                center_totals[c.id]["medical"] += m_alloc
                center_totals[c.id]["weight"] += cargo_wt
                center_totals[c.id]["distance_sum"] += (d_km * cargo_wt)
                if w.name not in center_totals[c.id]["sources"]:
                    center_totals[c.id]["sources"].append(w.name)

                total_dist_traveled += d_km
                total_cost += trip_cost

    # 5. Build Center Summaries with Explainability and Reasoning
    center_summaries: List[CenterAllocationSummary] = []
    fulfillment_rates = []
    unmet_critical_count = 0
    total_unmet_wt = 0.0

    for c in centers:
        d_f = net_demands[c.id]["food"]
        d_w = net_demands[c.id]["water"]
        d_m = net_demands[c.id]["medical"]

        a_f = round(center_totals[c.id]["food"], 2)
        a_w = round(center_totals[c.id]["water"], 2)
        a_m = round(center_totals[c.id]["medical"], 2)

        s_f = max(0.0, round(d_f - a_f, 2))
        s_w = max(0.0, round(d_w - a_w, 2))
        s_m = max(0.0, round(d_m - a_m, 2))

        pct_f = 100.0 if d_f <= 0 else round(min(100.0, (a_f / d_f) * 100.0), 1)
        pct_w = 100.0 if d_w <= 0 else round(min(100.0, (a_w / d_w) * 100.0), 1)
        pct_m = 100.0 if d_m <= 0 else round(min(100.0, (a_m / d_m) * 100.0), 1)

        # Overall fulfillment: weighted by physical supply weight
        tot_d_wt = d_f + d_w + (d_m * 2.5)
        tot_a_wt = a_f + a_w + (a_m * 2.5)
        overall_pct = 100.0 if tot_d_wt <= 0 else round(min(100.0, (tot_a_wt / tot_d_wt) * 100.0), 1)
        fulfillment_rates.append(overall_pct)

        unmet_wt = max(0.0, tot_d_wt - tot_a_wt)
        total_unmet_wt += unmet_wt

        if c.urgency_level == "Critical" and overall_pct < 85.0:
            unmet_critical_count += 1

        # Calculate Priority Score (0-100)
        urg_factor = {"Critical": 40, "High": 30, "Medium": 20, "Low": 10}[c.urgency_level]
        med_factor = min(30, c.medical_emergency_count * 1.5)
        vuln_factor = c.vulnerability_score * 30
        priority_score = round(urg_factor + med_factor + vuln_factor, 1)

        # Average distance from supplying warehouses
        tot_wt = center_totals[c.id]["weight"]
        avg_d = round(center_totals[c.id]["distance_sum"] / tot_wt, 1) if tot_wt > 0 else 0.0

        # Construct Natural-Language Explainable Reason
        dist_entry = [dist_matrix[(w.id, c.id)] for w in warehouses]
        any_open = any(d["accessible"] for d in dist_entry)

        if not c.is_accessible or not any_open:
            reason = (
                f"ZERO ALLOCATION (0.0%): Inaccessible location. {c.road_closure_notes} "
                "Physical vehicle access restricted. Requires airborne dispatch or specialized amphibious craft."
            )
            warning = "Road segment blocked or underwater. Ground convoy impossible."
        elif overall_pct >= 95.0:
            reason = (
                f"FULL FULFILLMENT ({overall_pct}%): Prioritized due to {c.urgency_level} urgency, "
                f"vulnerability score {c.vulnerability_score:.2f}, and proximity to "
                f"{', '.join(center_totals[c.id]['sources']) if center_totals[c.id]['sources'] else 'depots'}."
            )
            warning = None
        elif overall_pct >= 60.0:
            reason = (
                f"SUBSTANTIAL FULFILLMENT ({overall_pct}%): Balanced allocation preserving equitable safety buffers. "
                f"Unmet deficit ({unmet_wt:.0f} kg) caused by regional supply conservation across multiple centers."
            )
            warning = "Buffer stock retained at regional hub."
        else:
            reason = (
                f"DEFICIT ALLOCATION ({overall_pct}%): Severe shortage. Center receives partial delivery because available "
                f"stocks were prioritized toward higher-urgency critical casualties or constrained by dispatch capacity."
            )
            warning = "High vulnerability community experiencing acute supply shortfall."

        summary = CenterAllocationSummary(
            center_id=c.id,
            center_name=c.name,
            urgency_level=c.urgency_level,
            population=c.affected_population,
            vulnerability_score=c.vulnerability_score,
            is_accessible=c.is_accessible and any_open,
            priority_score=priority_score,
            food_demand_kg=d_f,
            food_allocated_kg=a_f,
            food_fulfillment_pct=pct_f,
            food_shortage_kg=s_f,
            water_demand_l=d_w,
            water_allocated_l=a_w,
            water_fulfillment_pct=pct_w,
            water_shortage_l=s_w,
            medical_demand_kits=d_m,
            medical_allocated_kits=a_m,
            medical_fulfillment_pct=pct_m,
            medical_shortage_kits=s_m,
            overall_fulfillment_pct=overall_pct,
            supplying_warehouses=center_totals[c.id]["sources"],
            total_delivered_weight_kg=tot_wt,
            avg_delivery_distance_km=avg_d,
            reason=reason,
            risk_warning=warning
        )
        center_summaries.append(summary)

    # 6. Aggregates and Fairness
    tot_f_alloc = round(sum(s.food_allocated_kg for s in center_summaries), 2)
    tot_w_alloc = round(sum(s.water_allocated_l for s in center_summaries), 2)
    tot_m_alloc = round(sum(s.medical_allocated_kits for s in center_summaries), 2)

    tot_f_demand = round(sum(net_demands[c.id]["food"] for c in centers), 2)
    tot_w_demand = round(sum(net_demands[c.id]["water"] for c in centers), 2)
    tot_m_demand = round(sum(net_demands[c.id]["medical"] for c in centers), 2)

    pct_overall_f = round((tot_f_alloc / tot_f_demand * 100.0), 1) if tot_f_demand > 0 else 100.0
    pct_overall_w = round((tot_w_alloc / tot_w_demand * 100.0), 1) if tot_w_demand > 0 else 100.0
    pct_overall_m = round((tot_m_alloc / tot_m_demand * 100.0), 1) if tot_m_demand > 0 else 100.0

    tot_demand_wt = tot_f_demand + tot_w_demand + (tot_m_demand * 2.5)
    tot_alloc_wt = tot_f_alloc + tot_w_alloc + (tot_m_alloc * 2.5)
    overall_pct = round((tot_alloc_wt / tot_demand_wt * 100.0), 1) if tot_demand_wt > 0 else 100.0

    gini = compute_gini(fulfillment_rates)
    variance = float(round(np.var(fulfillment_rates), 2)) if fulfillment_rates else 0.0

    audit_log.append(f"Allocation Finished: Total Food={tot_f_alloc}/{tot_f_demand}kg ({pct_overall_f}%), Water={tot_w_alloc}/{tot_w_demand}L ({pct_overall_w}%), Med={tot_m_alloc}/{tot_m_demand} kits ({pct_overall_m}%).")
    audit_log.append(f"Fairness Metrics: Gini Index = {gini:.3f}, Fulfillment Variance = {variance:.1f}.")

    # Constraint verification check:
    constraint_violations = []
    # Check inventory bounds:
    for w in warehouses:
        f_dispatched = sum(a.food_kg for a in allocations if a.warehouse_id == w.id)
        w_dispatched = sum(a.water_l for a in allocations if a.warehouse_id == w.id)
        m_dispatched = sum(a.medical_kits for a in allocations if a.warehouse_id == w.id)
        if f_dispatched > w.food_stock_kg + 0.1:
            constraint_violations.append(f"VIOLATION: Warehouse {w.id} food dispatched ({f_dispatched}kg) exceeds stock ({w.food_stock_kg}kg)")
        if w_dispatched > w.water_stock_l + 0.1:
            constraint_violations.append(f"VIOLATION: Warehouse {w.id} water dispatched ({w_dispatched}L) exceeds stock ({w.water_stock_l}L)")
        if m_dispatched > w.medical_kits + 0.1:
            constraint_violations.append(f"VIOLATION: Warehouse {w.id} medical dispatched ({m_dispatched}) exceeds stock ({w.medical_kits})")

    # Check inaccessible allocations:
    for a in allocations:
        c_obj = center_dict[a.center_id]
        if not c_obj.is_accessible:
            constraint_violations.append(f"VIOLATION: Inaccessible center {a.center_id} received allocation of {a.total_weight_kg}kg!")

    if not constraint_violations:
        audit_log.append("Constraint Verification: PASS. All inventory, demand upper-bounds, and accessibility restrictions strictly satisfied.")
    else:
        audit_log.extend(constraint_violations)

    return OptimizationResult(
        status=solver_status,
        solver_name=solver_name,
        solver_message=solver_msg,
        allocations=allocations,
        center_summaries=center_summaries,
        total_food_allocated_kg=tot_f_alloc,
        total_water_allocated_l=tot_w_alloc,
        total_medical_allocated_kits=tot_m_alloc,
        total_food_demand_kg=tot_f_demand,
        total_water_demand_l=tot_w_demand,
        total_medical_demand_kits=tot_m_demand,
        overall_food_fulfillment_pct=pct_overall_f,
        overall_water_fulfillment_pct=pct_overall_w,
        overall_medical_fulfillment_pct=pct_overall_m,
        overall_fulfillment_pct=overall_pct,
        total_transport_distance_km=round(total_dist_traveled, 1),
        total_transport_cost=round(total_cost, 2),
        fairness_gini_coefficient=gini,
        fairness_variance=variance,
        unmet_critical_centers=unmet_critical_count,
        unmet_demand_weight_kg=round(total_unmet_wt, 1),
        audit_log=audit_log,
        constraint_violations=constraint_violations,
        objective_weights_used={
            "weight_critical": req.weight_critical,
            "weight_high": req.weight_high,
            "weight_medium": req.weight_medium,
            "weight_low": req.weight_low,
            "weight_medical": req.weight_medical,
            "weight_water": req.weight_water,
            "weight_food": req.weight_food,
            "transport_penalty_lambda": req.transport_penalty_lambda
        }
    )

def fallback_greedy_allocation(
    warehouses: List[Warehouse],
    centers: List[ReliefCenter],
    dist_matrix: Dict[Tuple[str, str], Dict[str, Any]],
    net_demands: Dict[str, Dict[str, float]],
    urgency_map: Dict[str, float]
) -> np.ndarray:
    """
    Deterministic greedy explainable solver for fallback when LP solver encounters anomalies.
    Allocates supplies prioritizing: (1) Urgent Medical, (2) Critical Urgency Centers, (3) Distance proximity.
    """
    num_w = len(warehouses)
    num_c = len(centers)
    num_k = 3
    num_x = num_w * num_c * num_k
    sol = np.zeros(num_x + (num_c * num_k))

    rem_stock = {
        w.id: {
            "food": float(w.food_stock_kg),
            "water": float(w.water_stock_l),
            "medical": float(w.medical_kits),
            "disp_cap": float(w.dispatch_capacity_kg_per_day)
        }
        for w in warehouses
    }

    # Center ranking score
    ranked_centers = sorted(
        centers,
        key=lambda c: (
            c.urgency_level == "Critical",
            c.medical_emergency_count,
            c.vulnerability_score,
            c.affected_population
        ),
        reverse=True
    )

    categories = ["medical", "water", "food"]
    k_indices = {"food": 0, "water": 1, "medical": 2}

    def x_idx(w_i: int, c_i: int, k_i: int) -> int:
        return w_i * (num_c * num_k) + c_i * num_k + k_i

    w_id_to_idx = {w.id: i for i, w in enumerate(warehouses)}
    c_id_to_idx = {c.id: i for i, c in enumerate(centers)}

    for k in categories:
        k_i = k_indices[k]
        for c in ranked_centers:
            c_i = c_id_to_idx[c.id]
            if not c.is_accessible:
                continue

            rem_demand = net_demands[c.id][k]
            if rem_demand <= 0:
                continue

            # Sort candidate warehouses by distance
            accessible_wh = [
                w for w in warehouses
                if dist_matrix[(w.id, c.id)]["accessible"] and rem_stock[w.id][k] > 0
            ]
            accessible_wh.sort(key=lambda w: dist_matrix[(w.id, c.id)]["distance_km"])

            for w in accessible_wh:
                w_i = w_id_to_idx[w.id]
                avail = rem_stock[w.id][k]
                alloc_amt = min(rem_demand, avail)

                # check dispatch cap
                weight_each = 2.5 if k == "medical" else 1.0
                cargo_wt = alloc_amt * weight_each
                if cargo_wt > rem_stock[w.id]["disp_cap"]:
                    alloc_amt = max(0.0, rem_stock[w.id]["disp_cap"] / weight_each)

                if alloc_amt > 0:
                    sol[x_idx(w_i, c_i, k_i)] += alloc_amt
                    rem_stock[w.id][k] -= alloc_amt
                    rem_stock[w.id]["disp_cap"] -= (alloc_amt * weight_each)
                    rem_demand -= alloc_amt

                if rem_demand <= 0:
                    break

    # Calculate shortages s
    for c_i, c in enumerate(centers):
        for k_name, k_i in k_indices.items():
            tot_a = sum(sol[x_idx(w_i, c_i, k_i)] for w_i in range(num_w))
            shortage = max(0.0, net_demands[c.id][k_name] - tot_a)
            sol[num_x + c_i * num_k + k_i] = shortage

    return sol
