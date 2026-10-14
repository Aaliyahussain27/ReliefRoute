"""
Database Persistence Layer using SQLite.
Stores relief centers, warehouses, vehicles, road segments, and audit logs.
Automatically initializes with deterministic realistic disaster baseline dataset.
"""

import sqlite3
import json
from typing import List, Optional, Dict, Any
from .config import DB_PATH
from .models.domain import ReliefCenter, Warehouse, Vehicle, RoadSegment
from .services.sample_data import (
    get_default_relief_centers,
    get_default_warehouses,
    get_default_vehicles,
    get_default_road_network
)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Relief Centers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS relief_centers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        affected_population INTEGER NOT NULL,
        vulnerability_score REAL NOT NULL,
        urgency_level TEXT NOT NULL,
        medical_emergency_count INTEGER NOT NULL,
        is_accessible INTEGER NOT NULL,
        road_closure_notes TEXT,
        local_food_stock_kg REAL DEFAULT 0,
        local_water_stock_l REAL DEFAULT 0,
        local_medical_kits REAL DEFAULT 0
    )
    """)

    # Warehouses Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        food_stock_kg REAL NOT NULL,
        water_stock_l REAL NOT NULL,
        medical_kits REAL NOT NULL,
        dispatch_capacity_kg_per_day REAL NOT NULL,
        operating_status TEXT NOT NULL
    )
    """)

    # Vehicles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        max_payload_kg REAL NOT NULL,
        available_units INTEGER NOT NULL,
        cost_per_km REAL NOT NULL,
        max_water_volume_l REAL,
        max_medical_kits REAL,
        speed_kmh REAL NOT NULL
    )
    """)

    # Road Segments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        distance_km REAL NOT NULL,
        estimated_travel_time_min REAL NOT NULL,
        is_accessible INTEGER NOT NULL,
        road_status TEXT NOT NULL,
        risk_delay_score REAL NOT NULL,
        notes TEXT
    )
    """)

    # Audit Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL
    )
    """)

    conn.commit()

    # Populate sample data if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM relief_centers")
    if cursor.fetchone()["cnt"] == 0:
        reset_to_default_dataset(conn)

    conn.close()

def reset_to_default_dataset(conn=None):
    close_when_done = False
    if conn is None:
        conn = get_connection()
        close_when_done = True

    cursor = conn.cursor()
    cursor.execute("DELETE FROM relief_centers")
    cursor.execute("DELETE FROM warehouses")
    cursor.execute("DELETE FROM vehicles")
    cursor.execute("DELETE FROM road_segments")

    for c in get_default_relief_centers():
        cursor.execute("""
            INSERT INTO relief_centers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c.id, c.name, c.lat, c.lng, c.affected_population, c.vulnerability_score,
            c.urgency_level, c.medical_emergency_count, 1 if c.is_accessible else 0,
            c.road_closure_notes, c.local_food_stock_kg, c.local_water_stock_l, c.local_medical_kits
        ))

    for w in get_default_warehouses():
        cursor.execute("""
            INSERT INTO warehouses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            w.id, w.name, w.lat, w.lng, w.food_stock_kg, w.water_stock_l,
            w.medical_kits, w.dispatch_capacity_kg_per_day, w.operating_status
        ))

    for v in get_default_vehicles():
        cursor.execute("""
            INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            v.id, v.type, v.max_payload_kg, v.available_units, v.cost_per_km,
            v.max_water_volume_l, v.max_medical_kits, v.speed_kmh
        ))

    for r in get_default_road_network():
        cursor.execute("""
            INSERT INTO road_segments (from_id, to_id, distance_km, estimated_travel_time_min, is_accessible, road_status, risk_delay_score, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r.from_id, r.to_id, r.distance_km, r.estimated_travel_time_min,
            1 if r.is_accessible else 0, r.road_status, r.risk_delay_score, r.notes
        ))

    conn.commit()
    if close_when_done:
        conn.close()

def db_get_relief_centers() -> List[ReliefCenter]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM relief_centers ORDER BY id ASC")
    rows = cursor.fetchall()
    centers = [
        ReliefCenter(
            id=r["id"],
            name=r["name"],
            lat=r["lat"],
            lng=r["lng"],
            affected_population=r["affected_population"],
            vulnerability_score=r["vulnerability_score"],
            urgency_level=r["urgency_level"],
            medical_emergency_count=r["medical_emergency_count"],
            is_accessible=bool(r["is_accessible"]),
            road_closure_notes=r["road_closure_notes"] or "",
            local_food_stock_kg=r["local_food_stock_kg"],
            local_water_stock_l=r["local_water_stock_l"],
            local_medical_kits=r["local_medical_kits"]
        )
        for r in rows
    ]
    conn.close()
    return centers

def db_get_warehouses() -> List[Warehouse]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM warehouses ORDER BY id ASC")
    rows = cursor.fetchall()
    warehouses = [
        Warehouse(
            id=r["id"],
            name=r["name"],
            lat=r["lat"],
            lng=r["lng"],
            food_stock_kg=r["food_stock_kg"],
            water_stock_l=r["water_stock_l"],
            medical_kits=r["medical_kits"],
            dispatch_capacity_kg_per_day=r["dispatch_capacity_kg_per_day"],
            operating_status=r["operating_status"]
        )
        for r in rows
    ]
    conn.close()
    return warehouses

def db_get_vehicles() -> List[Vehicle]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles ORDER BY id ASC")
    rows = cursor.fetchall()
    vehicles = [
        Vehicle(
            id=r["id"],
            type=r["type"],
            max_payload_kg=r["max_payload_kg"],
            available_units=r["available_units"],
            cost_per_km=r["cost_per_km"],
            max_water_volume_l=r["max_water_volume_l"],
            max_medical_kits=r["max_medical_kits"],
            speed_kmh=r["speed_kmh"]
        )
        for r in rows
    ]
    conn.close()
    return vehicles

def db_get_road_segments() -> List[RoadSegment]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM road_segments")
    rows = cursor.fetchall()
    roads = [
        RoadSegment(
            from_id=r["from_id"],
            to_id=r["to_id"],
            distance_km=r["distance_km"],
            estimated_travel_time_min=r["estimated_travel_time_min"],
            is_accessible=bool(r["is_accessible"]),
            road_status=r["road_status"],
            risk_delay_score=r["risk_delay_score"],
            notes=r["notes"] or ""
        )
        for r in rows
    ]
    conn.close()
    return roads

def db_save_relief_center(c: ReliefCenter):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO relief_centers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        c.id, c.name, c.lat, c.lng, c.affected_population, c.vulnerability_score,
        c.urgency_level, c.medical_emergency_count, 1 if c.is_accessible else 0,
        c.road_closure_notes, c.local_food_stock_kg, c.local_water_stock_l, c.local_medical_kits
    ))
    conn.commit()
    conn.close()

def db_save_warehouse(w: Warehouse):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO warehouses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        w.id, w.name, w.lat, w.lng, w.food_stock_kg, w.water_stock_l,
        w.medical_kits, w.dispatch_capacity_kg_per_day, w.operating_status
    ))
    conn.commit()
    conn.close()
