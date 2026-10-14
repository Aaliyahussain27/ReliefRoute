"""
CSV Import, Export, and Validation Service for ReliefRoute.
Generates template CSVs, validates uploaded datasets with comprehensive error reporting,
and exports allocation, delivery, and scenario tables to standard CSV.
"""

from typing import List, Dict, Any, Tuple
import io
import csv
from ..models.domain import ReliefCenter, Warehouse, AllocationItem, DeliveryTrip
from ..models.api_models import CSVImportResponse, CenterScenarioDelta

def get_relief_centers_csv_template() -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "name", "lat", "lng", "affected_population", "vulnerability_score",
        "urgency_level", "medical_emergency_count", "is_accessible", "road_closure_notes",
        "local_food_stock_kg", "local_water_stock_l", "local_medical_kits"
    ])
    writer.writerow([
        "RC-09", "East Bay Shelter", 14.5600, 121.0500, 2500, 0.60,
        "High", 12, "true", "Access route clear", 150.0, 500.0, 5.0
    ])
    return output.getvalue()

def get_warehouses_csv_template() -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "name", "lat", "lng", "food_stock_kg", "water_stock_l",
        "medical_kits", "dispatch_capacity_kg_per_day", "operating_status"
    ])
    writer.writerow([
        "WH-04", "Western Airport Stockpile", 14.5100, 120.9500,
        15000.0, 30000.0, 200.0, 25000.0, "Active"
    ])
    return output.getvalue()

def parse_relief_centers_csv(csv_content: str) -> Tuple[List[ReliefCenter], List[str], List[str]]:
    """
    Parses and validates CSV text into ReliefCenter objects.
    Returns (valid_centers, warnings, errors).
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    valid_centers: List[ReliefCenter] = []
    warnings: List[str] = []
    errors: List[str] = []

    required_cols = {"id", "name", "lat", "lng", "affected_population"}
    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        errors.append(f"CSV missing mandatory columns: {required_cols - set(reader.fieldnames or [])}")
        return [], warnings, errors

    for row_idx, row in enumerate(reader, start=2):
        try:
            c_id = row.get("id", "").strip()
            name = row.get("name", "").strip()
            lat = float(row.get("lat", 0.0))
            lng = float(row.get("lng", 0.0))
            pop = int(row.get("affected_population", 0))

            if not c_id or not name:
                errors.append(f"Row {row_idx}: 'id' and 'name' cannot be blank.")
                continue

            if pop < 0:
                errors.append(f"Row {row_idx}: Population cannot be negative ({pop}).")
                continue

            vuln = float(row.get("vulnerability_score", 0.5))
            vuln = max(0.0, min(1.0, vuln))

            urgency = row.get("urgency_level", "Medium").strip().capitalize()
            if urgency not in ["Critical", "High", "Medium", "Low"]:
                warnings.append(f"Row {row_idx}: Unrecognized urgency '{urgency}'. Defaulting to 'Medium'.")
                urgency = "Medium"

            med_emerg = int(row.get("medical_emergency_count", 0))
            is_acc = str(row.get("is_accessible", "true")).lower() in ["true", "1", "yes"]
            notes = row.get("road_closure_notes", "").strip()

            local_food = float(row.get("local_food_stock_kg", 0.0))
            local_water = float(row.get("local_water_stock_l", 0.0))
            local_med = float(row.get("local_medical_kits", 0.0))

            center = ReliefCenter(
                id=c_id,
                name=name,
                lat=lat,
                lng=lng,
                affected_population=pop,
                vulnerability_score=vuln,
                urgency_level=urgency,
                medical_emergency_count=med_emerg,
                is_accessible=is_acc,
                road_closure_notes=notes,
                local_food_stock_kg=local_food,
                local_water_stock_l=local_water,
                local_medical_kits=local_med
            )
            valid_centers.append(center)
        except Exception as e:
            errors.append(f"Row {row_idx}: Parse error: {str(e)}")

    return valid_centers, warnings, errors

def parse_warehouses_csv(csv_content: str) -> Tuple[List[Warehouse], List[str], List[str]]:
    """
    Parses and validates CSV text into Warehouse objects.
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    valid_wh: List[Warehouse] = []
    warnings: List[str] = []
    errors: List[str] = []

    required_cols = {"id", "name", "lat", "lng", "food_stock_kg", "water_stock_l", "medical_kits"}
    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        errors.append(f"CSV missing mandatory columns: {required_cols - set(reader.fieldnames or [])}")
        return [], warnings, errors

    for row_idx, row in enumerate(reader, start=2):
        try:
            w_id = row.get("id", "").strip()
            name = row.get("name", "").strip()
            lat = float(row.get("lat", 0.0))
            lng = float(row.get("lng", 0.0))
            food = float(row.get("food_stock_kg", 0.0))
            water = float(row.get("water_stock_l", 0.0))
            med = float(row.get("medical_kits", 0.0))
            disp = float(row.get("dispatch_capacity_kg_per_day", 25000.0))
            status = row.get("operating_status", "Active").strip()
            if status not in ["Active", "Limited", "Closed"]:
                status = "Active"

            wh = Warehouse(
                id=w_id,
                name=name,
                lat=lat,
                lng=lng,
                food_stock_kg=food,
                water_stock_l=water,
                medical_kits=med,
                dispatch_capacity_kg_per_day=disp,
                operating_status=status
            )
            valid_wh.append(wh)
        except Exception as e:
            errors.append(f"Row {row_idx}: Parse error: {str(e)}")

    return valid_wh, warnings, errors

def export_allocations_csv(allocations: List[AllocationItem]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Warehouse_ID", "Warehouse_Name", "Center_ID", "Center_Name",
        "Food_Allocated_kg", "Water_Allocated_L", "Medical_Kits_Allocated",
        "Total_Weight_kg", "Distance_km", "Transport_Cost_USD", "Route_Status"
    ])
    for a in allocations:
        writer.writerow([
            a.warehouse_id, a.warehouse_name, a.center_id, a.center_name,
            a.food_kg, a.water_l, a.medical_kits,
            a.total_weight_kg, a.distance_km, a.transport_cost, a.route_status
        ])
    return output.getvalue()

def export_deliveries_csv(trips: List[DeliveryTrip]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Trip_ID", "Vehicle_ID", "Vehicle_Type", "Warehouse_ID", "Destination_Center",
        "Food_kg", "Water_L", "Medical_Kits", "Cargo_Weight_kg", "Payload_Capacity_kg",
        "Utilization_Pct", "Distance_km", "Travel_Time_min", "Cost_USD", "Priority_Justification"
    ])
    for t in trips:
        writer.writerow([
            t.trip_id, t.vehicle_id, t.vehicle_type, t.warehouse_id, t.center_name,
            t.food_kg, t.water_l, t.medical_kits, t.cargo_weight_kg, t.payload_capacity_kg,
            t.utilization_pct, t.distance_km, t.estimated_travel_time_min, t.transport_cost,
            t.priority_justification
        ])
    return output.getvalue()

def export_scenario_comparison_csv(deltas: List[CenterScenarioDelta]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Center_ID", "Center_Name", "Baseline_Fulfillment_Pct",
        "Scenario_Fulfillment_Pct", "Delta_Fulfillment_Pct",
        "Baseline_Unmet_kg", "Scenario_Unmet_kg", "Status_Change", "Primary_Reason"
    ])
    for d in deltas:
        writer.writerow([
            d.center_id, d.center_name, d.baseline_fulfillment_pct,
            d.scenario_fulfillment_pct, d.delta_fulfillment_pct,
            d.baseline_unmet_kg, d.scenario_unmet_kg, d.status_change, d.primary_reason
        ])
    return output.getvalue()
