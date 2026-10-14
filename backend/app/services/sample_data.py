"""
Sample synthetic dataset for ReliefRoute CEP 8 Disaster Logistics Demonstration.
Clearly labeled as fictional disaster response planning data.
"""

from typing import List
from ..models.domain import ReliefCenter, Warehouse, Vehicle, RoadSegment

def get_default_relief_centers() -> List[ReliefCenter]:
    return [
        ReliefCenter(
            id="RC-01",
            name="North Haven Community Shelter",
            lat=14.6520,
            lng=120.9650,
            affected_population=3200,
            vulnerability_score=0.45,
            urgency_level="High",
            medical_emergency_count=8,
            is_accessible=True,
            road_closure_notes="Primary bypass highway open; moderate debris cleared.",
            local_food_stock_kg=200.0,
            local_water_stock_l=600.0,
            local_medical_kits=5.0
        ),
        ReliefCenter(
            id="RC-02",
            name="San Miguel Parish Evacuation Center",
            lat=14.6150,
            lng=121.0120,
            affected_population=5400,
            vulnerability_score=0.65,
            urgency_level="High",
            medical_emergency_count=14,
            is_accessible=True,
            road_closure_notes="Arterial road passable by medium and heavy vehicles.",
            local_food_stock_kg=350.0,
            local_water_stock_l=1200.0,
            local_medical_kits=10.0
        ),
        ReliefCenter(
            id="RC-03",
            name="River Valley Civic Gymnasium",
            lat=14.5800,
            lng=121.0850,
            affected_population=6800,
            vulnerability_score=0.88,
            urgency_level="Critical",
            medical_emergency_count=42,  # Major trauma / acute injury emergency
            is_accessible=True,
            road_closure_notes="Eastern access bridge has single-lane priority traffic.",
            local_food_stock_kg=100.0,
            local_water_stock_l=400.0,
            local_medical_kits=2.0
        ),
        ReliefCenter(
            id="RC-04",
            name="Barangay Central Elementary Camp",
            lat=14.5500,
            lng=121.0350,
            affected_population=2900,
            vulnerability_score=0.35,
            urgency_level="Medium",
            medical_emergency_count=4,
            is_accessible=True,
            road_closure_notes="Urban avenues fully accessible.",
            local_food_stock_kg=150.0,
            local_water_stock_l=800.0,
            local_medical_kits=8.0
        ),
        ReliefCenter(
            id="RC-05",
            name="Delta Island Fisherfolk Compound",
            lat=14.4920,
            lng=120.9400,
            affected_population=2100,
            vulnerability_score=0.92,
            urgency_level="Critical",
            medical_emergency_count=18,
            is_accessible=False,  # Inaccessible / Cut-off by floodwaters
            road_closure_notes="Causeway submerged under 1.8m surge; land vehicles blocked. Requires amphibious craft or airlift.",
            local_food_stock_kg=50.0,
            local_water_stock_l=150.0,
            local_medical_kits=1.0
        ),
        ReliefCenter(
            id="RC-06",
            name="Mountain Ridge Highland Chapel",
            lat=14.6850,
            lng=121.1200,
            affected_population=1850,
            vulnerability_score=0.75,
            urgency_level="High",
            medical_emergency_count=9,
            is_accessible=True,
            road_closure_notes="Steep mountain pass; 4x4 high-clearance vehicles strongly advised.",
            local_food_stock_kg=80.0,
            local_water_stock_l=250.0,
            local_medical_kits=3.0
        ),
        ReliefCenter(
            id="RC-07",
            name="Southside Vocational Stadium",
            lat=14.5150,
            lng=121.0650,
            affected_population=4100,
            vulnerability_score=0.40,
            urgency_level="Medium",
            medical_emergency_count=6,
            is_accessible=True,
            road_closure_notes="South corridor fully operational.",
            local_food_stock_kg=300.0,
            local_water_stock_l=1000.0,
            local_medical_kits=12.0
        ),
        ReliefCenter(
            id="RC-08",
            name="Sunrise Hills Secondary School",
            lat=14.6400,
            lng=120.9100,
            affected_population=1600,
            vulnerability_score=0.25,
            urgency_level="Low",
            medical_emergency_count=1,
            is_accessible=True,
            road_closure_notes="Coastal highway north open with minimal disruption.",
            local_food_stock_kg=120.0,
            local_water_stock_l=500.0,
            local_medical_kits=6.0
        ),
    ]

def get_default_warehouses() -> List[Warehouse]:
    return [
        Warehouse(
            id="WH-01",
            name="Northern Central Logistics Hub",
            lat=14.6200,
            lng=120.9900,
            food_stock_kg=16000.0,
            water_stock_l=38000.0,
            medical_kits=350.0,
            dispatch_capacity_kg_per_day=30000.0,
            operating_status="Active"
        ),
        Warehouse(
            id="WH-02",
            name="Eastern Disaster Reserve Depot",
            lat=14.6050,
            lng=121.0700,
            food_stock_kg=11500.0,
            water_stock_l=24000.0,
            medical_kits=240.0,
            dispatch_capacity_kg_per_day=20000.0,
            operating_status="Active"
        ),
        Warehouse(
            id="WH-03",
            name="Southern Coastal Maritime Stockpile",
            lat=14.5200,
            lng=120.9850,
            food_stock_kg=8500.0,
            water_stock_l=18000.0,
            medical_kits=160.0,
            dispatch_capacity_kg_per_day=15000.0,
            operating_status="Active"
        ),
    ]

def get_default_vehicles() -> List[Vehicle]:
    return [
        Vehicle(
            id="VEH-01",
            type="Heavy Logistics Hauler (12T)",
            max_payload_kg=12000.0,
            available_units=2,
            cost_per_km=3.80,
            speed_kmh=40.0
        ),
        Vehicle(
            id="VEH-02",
            type="Medium Relief Truck (6T)",
            max_payload_kg=6000.0,
            available_units=3,
            cost_per_km=2.40,
            speed_kmh=45.0
        ),
        Vehicle(
            id="VEH-03",
            type="4x4 High-Clearance Tactical Truck (3.5T)",
            max_payload_kg=3500.0,
            available_units=3,
            cost_per_km=1.90,
            speed_kmh=40.0
        ),
        Vehicle(
            id="VEH-04",
            type="Rapid Medical & Supply Van (1.5T)",
            max_payload_kg=1500.0,
            available_units=2,
            cost_per_km=1.20,
            speed_kmh=55.0
        ),
        Vehicle(
            id="VEH-05",
            type="All-Terrain Amphibious Cargo (2T)",
            max_payload_kg=2000.0,
            available_units=1,
            cost_per_km=4.50,
            speed_kmh=25.0
        ),
    ]

def get_default_road_network() -> List[RoadSegment]:
    """
    Road segments connecting warehouses and relief centers.
    Includes accessible and blocked segments.
    """
    return [
        # Connections from WH-01 (Northern Central Hub)
        RoadSegment(from_id="WH-01", to_id="RC-01", distance_km=6.2, estimated_travel_time_min=14.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Route 1 North open"),
        RoadSegment(from_id="WH-01", to_id="RC-02", distance_km=4.5, estimated_travel_time_min=11.0, is_accessible=True, road_status="Clear", risk_delay_score=1.1, notes="Avenue open"),
        RoadSegment(from_id="WH-01", to_id="RC-04", distance_km=9.8, estimated_travel_time_min=22.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Urban boulevard clear"),
        RoadSegment(from_id="WH-01", to_id="RC-08", distance_km=8.5, estimated_travel_time_min=18.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Coastal bypass functional"),
        RoadSegment(from_id="WH-01", to_id="RC-03", distance_km=13.5, estimated_travel_time_min=32.0, is_accessible=True, road_status="Partially Blocked", risk_delay_score=1.4, notes="Heavy traffic and minor debris"),
        RoadSegment(from_id="WH-01", to_id="RC-06", distance_km=17.2, estimated_travel_time_min=42.0, is_accessible=True, road_status="Clear", risk_delay_score=1.2, notes="Ascending gradient"),

        # Connections from WH-02 (Eastern Disaster Reserve Depot)
        RoadSegment(from_id="WH-02", to_id="RC-03", distance_km=4.2, estimated_travel_time_min=10.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Direct access via East Parkway"),
        RoadSegment(from_id="WH-02", to_id="RC-02", distance_km=6.8, estimated_travel_time_min=16.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Connecting highway"),
        RoadSegment(from_id="WH-02", to_id="RC-06", distance_km=10.5, estimated_travel_time_min=26.0, is_accessible=True, road_status="Clear", risk_delay_score=1.3, notes="Mountain feeder road"),
        RoadSegment(from_id="WH-02", to_id="RC-07", distance_km=11.0, estimated_travel_time_min=24.0, is_accessible=True, road_status="Clear", risk_delay_score=1.1, notes="South-east link"),

        # Connections from WH-03 (Southern Coastal Maritime Stockpile)
        RoadSegment(from_id="WH-03", to_id="RC-04", distance_km=6.1, estimated_travel_time_min=15.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Port road open"),
        RoadSegment(from_id="WH-03", to_id="RC-07", distance_km=8.4, estimated_travel_time_min=19.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Southern ring highway"),
        # Segment to RC-05: Bridge out / flooded!
        RoadSegment(from_id="WH-03", to_id="RC-05", distance_km=7.5, estimated_travel_time_min=999.0, is_accessible=False, road_status="Flooded / Bridge Out", risk_delay_score=5.0, notes="Causeway Bridge collapsed due to flood surge"),
        RoadSegment(from_id="WH-01", to_id="RC-05", distance_km=15.8, estimated_travel_time_min=999.0, is_accessible=False, road_status="Flooded / Bridge Out", risk_delay_score=5.0, notes="Inaccessible via mainland route"),

        # Inter-warehouse logistics links
        RoadSegment(from_id="WH-01", to_id="WH-02", distance_km=9.2, estimated_travel_time_min=20.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Expressway connection"),
        RoadSegment(from_id="WH-01", to_id="WH-03", distance_km=11.5, estimated_travel_time_min=25.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Harbor expressway"),
        RoadSegment(from_id="WH-02", to_id="WH-03", distance_km=12.8, estimated_travel_time_min=28.0, is_accessible=True, road_status="Clear", risk_delay_score=1.0, notes="Outer ring road"),
    ]
