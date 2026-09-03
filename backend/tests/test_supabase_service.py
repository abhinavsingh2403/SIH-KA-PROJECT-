"""
Unit & Integration Tests for Supabase Cloud & Resilient Persistence Service.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.supabase_client import supabase_service

client = TestClient(app)


def test_supabase_service_initialization():
    status = supabase_service.get_status()
    assert "mode" in status
    assert status["mode"] in ("cloud", "local_fallback", "unconfigured")
    assert "tables" in status
    assert "flights" in status["tables"]


def test_supabase_flight_and_telemetry_save():
    flight_id = "test_flight_supabase_001"
    saved = supabase_service.save_flight(flight_id, profile="climb", duration_s=450.0, status="completed")
    assert saved["flight_id"] == flight_id
    assert saved["profile"] == "climb"

    # Save mock telemetry frame
    packet = {
        "flight_id": flight_id,
        "t": 45.2,
        "rpm": 2480.0,
        "mission_risk": {"health_score": 94.5},
        "stage1_anomaly": False,
        "stage2_fault": "normal",
        "channels": {"E1_CHT1": 164.0, "E1_OilP": 62.0},
    }
    success = supabase_service.save_telemetry_packet(packet)
    assert success is True

    # Retrieve flights
    flights = supabase_service.get_flights(limit=10)
    assert any(f["flight_id"] == flight_id for f in flights)


def test_supabase_alert_save_and_retrieve():
    alert_payload = {
        "alert_id": "test_alert_supabase_999",
        "flight_id": "test_flight_supabase_001",
        "timestamp": 120.5,
        "fault_type": "oil_cooler_degradation",
        "confidence": 0.98,
        "severity": "critical",
        "auto_action_eligible": True,
        "key_sensors": ["E1_OilT", "E1_OilP"],
        "report_text": "CRITICAL: Severe oil cooler heat exchanger degradation.",
    }
    saved = supabase_service.save_alert(alert_payload)
    assert saved is True

    alerts = supabase_service.get_alerts(limit=10)
    assert any(a["alert_id"] == "test_alert_supabase_999" for a in alerts)


def test_api_supabase_endpoints():
    res_status = client.get("/api/supabase/status")
    assert res_status.status_code == 200
    data = res_status.json()
    assert "mode" in data
    assert "tables" in data

    res_flights = client.get("/api/supabase/flights")
    assert res_flights.status_code == 200
    assert isinstance(res_flights.json(), list)

    res_alerts = client.get("/api/supabase/alerts")
    assert res_alerts.status_code == 200
    assert isinstance(res_alerts.json(), list)

    res_sync = client.post("/api/supabase/sync-flight/demo_test_sync")
    assert res_sync.status_code == 200
    assert res_sync.json()["status"] == "synced"
