import pytest
from app.services.csv_service import (
    get_relief_centers_csv_template, get_warehouses_csv_template,
    parse_relief_centers_csv, parse_warehouses_csv
)

def test_csv_templates():
    rc_tpl = get_relief_centers_csv_template()
    assert "affected_population" in rc_tpl
    assert "vulnerability_score" in rc_tpl

    wh_tpl = get_warehouses_csv_template()
    assert "food_stock_kg" in wh_tpl
    assert "water_stock_l" in wh_tpl

def test_csv_validation_errors():
    # Missing columns
    invalid_csv = "id,name\nRC-99,Broken\n"
    centers, warnings, errors = parse_relief_centers_csv(invalid_csv)
    assert len(errors) > 0

    # Negative population
    neg_pop_csv = "id,name,lat,lng,affected_population\nRC-99,Broken,14.5,121.0,-500\n"
    centers, warnings, errors = parse_relief_centers_csv(neg_pop_csv)
    assert any("negative" in e.lower() for e in errors)
