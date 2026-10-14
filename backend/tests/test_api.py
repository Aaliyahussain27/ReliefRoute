import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_api_relief_centers_and_warehouses():
    res_c = client.get("/api/relief-centers")
    assert res_c.status_code == 200
    centers = res_c.json()
    assert len(centers) >= 8

    res_w = client.get("/api/warehouses")
    assert res_w.status_code == 200
    warehouses = res_w.json()
    assert len(warehouses) >= 3

def test_api_demand_and_optimization():
    res_d = client.post("/api/demand/estimate", json={"planning_horizon_days": 3.0})
    assert res_d.status_code == 200
    demand = res_d.json()
    assert demand["total_food_demand_kg"] > 0
    assert demand["total_water_demand_l"] > 0

    res_opt = client.post("/api/allocation/optimize", json={"planning_horizon_days": 3.0})
    assert res_opt.status_code == 200
    opt = res_opt.json()
    assert opt["status"] in ["OPTIMAL", "FEASIBLE", "FALLBACK_HEURISTIC"]
    assert len(opt["allocations"]) > 0

def test_api_scenario_and_reports():
    res_scen = client.post("/api/scenarios/run", json={"scenario_id": "B"})
    assert res_scen.status_code == 200
    scen = res_scen.json()
    assert scen["scenario_id"] == "B"

    res_rep = client.post("/api/reports/generate")
    assert res_rep.status_code == 200
    rep = res_rep.json()
    assert rep["sections_count"] == 16
    assert "RELIEFROUTE" in rep["markdown"]

    res_pdf = client.get("/api/reports/download/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
