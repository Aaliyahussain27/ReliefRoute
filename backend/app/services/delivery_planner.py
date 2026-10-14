"""
Delivery Planning and Fleet Routing Engine for ReliefRoute.
Generates feasible dispatch trip schedules respecting vehicle payload capacities,
road accessibility, transport economics, and emergency priorities.
"""

from typing import List, Dict, Any, Optional
from ..models.domain import (
    Vehicle, Warehouse, ReliefCenter, RoadSegment,
    DeliveryTrip, OptimizationResult, AllocationItem
)
from ..models.api_models import DeliveryPlanResponse
from .optimization_engine import compute_network_distances

def generate_delivery_plan(
    allocations: List[AllocationItem],
    vehicles: List[Vehicle],
    centers: List[ReliefCenter],
    warehouses: List[Warehouse],
    road_segments: List[RoadSegment]
) -> DeliveryPlanResponse:
    """
    Schedules vehicle dispatches for all recommended allocations.
    Packs loads into available vehicle capacities and assigns priorities based on center urgency.
    """
    center_map = {c.id: c for c in centers}
    wh_map = {w.id: w for w in warehouses}
    dist_matrix = compute_network_distances(warehouses, centers, road_segments)

    # Filter out empty allocations or unreachable ones
    active_allocs = [a for a in allocations if a.total_weight_kg > 0.5 and a.is_reachable]

    # Sort allocations by destination urgency: Critical first, then High, etc.
    urgency_ranks = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}
    active_allocs.sort(
        key=lambda a: (
            urgency_ranks.get(center_map[a.center_id].urgency_level, 3),
            -center_map[a.center_id].medical_emergency_count,
            -a.total_weight_kg
        )
    )

    # Sort vehicles by payload descending so we can select appropriate vehicle sizing
    # Expand fleet pool by available_units
    fleet_pool = []
    for v in vehicles:
        for u in range(v.available_units):
            fleet_pool.append({
                "vehicle": v,
                "unit_num": u + 1,
                "trips_assigned": 0,
                "total_km": 0.0,
                "total_weight_hauled": 0.0
            })

    # Fallback vehicle if pool empty
    if not fleet_pool:
        fallback_veh = Vehicle(
            id="VEH-DEFAULT",
            type="Standard 5T Relief Truck",
            max_payload_kg=5000.0,
            available_units=5,
            cost_per_km=2.50,
            speed_kmh=40.0
        )
        fleet_pool.append({
            "vehicle": fallback_veh,
            "unit_num": 1,
            "trips_assigned": 0,
            "total_km": 0.0,
            "total_weight_hauled": 0.0
        })

    trips: List[DeliveryTrip] = []
    trip_counter = 1
    total_cargo_wt = 0.0
    total_dist = 0.0
    total_cost = 0.0
    inaccessible_unserved = [c.name for c in centers if not c.is_accessible]

    for alloc in active_allocs:
        c = center_map[alloc.center_id]
        w = wh_map[alloc.warehouse_id]
        dist_info = dist_matrix.get((w.id, c.id), {"distance_km": alloc.distance_km, "time_min": 30.0, "path": [w.id, c.id]})
        dist_km = dist_info.get("distance_km", alloc.distance_km)
        time_min = dist_info.get("time_min", round((dist_km / 40.0) * 60, 1))
        path_nodes = dist_info.get("path", [w.id, c.id])

        rem_food = alloc.food_kg
        rem_water = alloc.water_l
        rem_med = alloc.medical_kits

        # Dispatch in chunks respecting vehicle max payload
        while (rem_food + rem_water + (rem_med * 2.5)) > 0.5:
            # Pick best suited vehicle with lowest total km assigned
            # Prefer larger vehicle if remaining load is large
            pending_weight = rem_food + rem_water + (rem_med * 2.5)

            # Sort fleet by suitability: payload capacity >= pending_weight if possible, then fewest trips
            fleet_pool.sort(
                key=lambda f: (
                    f["trips_assigned"],
                    abs(f["vehicle"].max_payload_kg - pending_weight)
                )
            )

            chosen = fleet_pool[0]
            veh = chosen["vehicle"]
            max_p = veh.max_payload_kg

            # Proportionally load cargo up to vehicle max payload
            total_rem_wt = rem_food + rem_water + (rem_med * 2.5)
            load_ratio = min(1.0, max_p / total_rem_wt) if total_rem_wt > 0 else 1.0

            trip_food = round(rem_food * load_ratio, 1)
            trip_water = round(rem_water * load_ratio, 1)
            trip_med = round(rem_med * load_ratio, 1)
            trip_wt = round(trip_food + trip_water + (trip_med * 2.5), 1)

            if trip_wt <= 0.1:
                break

            rem_food = max(0.0, rem_food - trip_food)
            rem_water = max(0.0, rem_water - trip_water)
            rem_med = max(0.0, rem_med - trip_med)

            utilization = round((trip_wt / max_p) * 100.0, 1)
            trip_cost = round(dist_km * veh.cost_per_km, 2)
            adjusted_time = round(dist_km / veh.speed_kmh * 60.0, 1)

            # Operational justification
            if c.urgency_level == "Critical":
                justification = f"Priority 1 Dispatch: Life-saving delivery for {c.medical_emergency_count} urgent medical cases and {c.affected_population} cut-off citizens."
            elif c.urgency_level == "High":
                justification = f"Priority 2 Dispatch: High vulnerability sector relief ({c.affected_population} population, vuln {c.vulnerability_score:.2f})."
            else:
                justification = f"Priority 3 Dispatch: Scheduled replenishment for {c.name}."

            trip = DeliveryTrip(
                trip_id=f"TRIP-{trip_counter:03d}",
                vehicle_id=f"{veh.id}#{chosen['unit_num']}",
                vehicle_type=veh.type,
                warehouse_id=w.id,
                warehouse_name=w.name,
                center_id=c.id,
                center_name=c.name,
                food_kg=trip_food,
                water_l=trip_water,
                medical_kits=trip_med,
                cargo_weight_kg=trip_wt,
                payload_capacity_kg=max_p,
                utilization_pct=utilization,
                distance_km=dist_km,
                estimated_travel_time_min=adjusted_time,
                transport_cost=trip_cost,
                priority_rank=trip_counter,
                priority_justification=justification,
                road_condition=dist_info.get("reason", "Accessible"),
                intermediate_waypoints=path_nodes
            )
            trips.append(trip)
            trip_counter += 1

            chosen["trips_assigned"] += 1
            chosen["total_km"] += dist_km
            chosen["total_weight_hauled"] += trip_wt

            total_cargo_wt += trip_wt
            total_dist += dist_km
            total_cost += trip_cost

    # Vehicle utilization summary
    utilization_summary = {}
    for entry in fleet_pool:
        v_key = f"{entry['vehicle'].id} ({entry['vehicle'].type})"
        if v_key not in utilization_summary:
            utilization_summary[v_key] = {
                "trips": 0,
                "total_km": 0.0,
                "total_weight_hauled_kg": 0.0
            }
        utilization_summary[v_key]["trips"] += entry["trips_assigned"]
        utilization_summary[v_key]["total_km"] = round(utilization_summary[v_key]["total_km"] + entry["total_km"], 1)
        utilization_summary[v_key]["total_weight_hauled_kg"] = round(
            utilization_summary[v_key]["total_weight_hauled_kg"] + entry["total_weight_hauled"], 1
        )

    return DeliveryPlanResponse(
        trips=trips,
        total_trips=len(trips),
        total_distance_km=round(total_dist, 1),
        total_cost=round(total_cost, 2),
        total_cargo_weight_kg=round(total_cargo_wt, 1),
        vehicle_utilization_summary=utilization_summary,
        unserved_allocations_kg=0.0,
        inaccessible_centers_unserved=inaccessible_unserved
    )
