"""
SIH26054 — End-to-End API Integration Tests
Validates all 10 FastAPI modules via TestClient.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert data["sensor_channels"] == 15
    assert data["stage1_trained"] is True
    assert data["stage2_trained"] is True


def test_full_pipeline_api_flow():
    # 1. Simulate Flight
    sim_res = client.post(
        "/api/simulate/flight",
        json={"duration_minutes": 5, "profile": "patrol", "engine_id": "uav_01"},
    )
    assert sim_res.status_code == 200
    flight_data = sim_res.json()
    flight_id = flight_data["flight_id"]
    assert flight_id.startswith("flight_")

    # 2. Inject Fault
    fault_res = client.post(
        "/api/simulate/inject-fault",
        json={
            "flight_id": flight_id,
            "fault_type": "cylinder_head_overheat",
            "onset_time_pct": 0.3,
            "severity": 0.8,
            "target_cylinder": 2,
        },
    )
    assert fault_res.status_code == 200
    assert fault_res.json()["fault_type"] == "cylinder_head_overheat"

    # 3. Digital Twin Residuals
    twin_res = client.get(f"/api/twin/residuals?flight_id={flight_id}")
    assert twin_res.status_code == 200
    residuals = twin_res.json()
    assert "E1_CHT2" in residuals["channels"]
    assert len(residuals["channels"]["E1_CHT2"]) > 0

    # 4. Decision & Alerting
    alert_res = client.get(f"/api/alerts?flight_id={flight_id}")
    assert alert_res.status_code == 200
    alerts = alert_res.json()
    assert len(alerts) >= 1
    top_alert = alerts[0]
    assert "report_text" in top_alert

    # 5. Mission Risk
    risk_res = client.get(f"/api/mission-risk?flight_id={flight_id}")
    assert risk_res.status_code == 200
    assert "health_score" in risk_res.json()

    # 6. What-If Mode
    whatif_res = client.post(
        "/api/mission-risk/what-if",
        json={"engine_id": "uav_01", "planned_duration_minutes": 90},
    )
    assert whatif_res.status_code == 200
    assert "survivable" in whatif_res.json()

    # 7. Copilot Chat
    chat_res = client.post(
        "/api/copilot/chat",
        json={
            "flight_id": flight_id,
            "message": "Why was this flight flagged?",
            "conversation_history": [],
        },
    )
    assert chat_res.status_code == 200
    assert len(chat_res.json()["reply"]) > 10

    # 8. Black-Box Replay
    replay_res = client.get(f"/api/replay/{flight_id}?start=0&limit=50")
    assert replay_res.status_code == 200
    events = replay_res.json()["events"]
    assert len(events) == 50
    assert "E1_CHT1" in events[0]["channel_values"]

    # 9. Feedback Loop
    fb_res = client.post(
        "/api/feedback",
        json={"alert_id": top_alert["alert_id"], "verdict": "true_positive"},
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["status"] == "recorded"
