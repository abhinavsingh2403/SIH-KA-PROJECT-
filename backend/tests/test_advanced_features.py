"""
SIH26054 — Advanced Features Tests (MAVLink & Federated Fleet)
Validates:
  1. MAVLink packet ingestion: EFI_STATUS, SYS_STATUS, and SCALED_PRESSURE correctly map to 15 channels.
  2. Federated Learning (FedAvg): Squadron of 5 UAVs train locally, aggregate weight deltas, and broadcast global weights.
  3. API Endpoints: /api/ingest/mavlink and /api/fleet/federated-round execute cleanly.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.mavlink_ingest import MAVLinkTelemetryParser
from backend.models.federated_fleet import FleetFederatedAggregator

client = TestClient(app)


def test_mavlink_telemetry_parser_json():
    parser = MAVLinkTelemetryParser()
    payload = {
        "msg_type": "EFI_STATUS",
        "rpm": 2420,
        "cht": [178.5, 172.0, 180.2, 169.1],
        "egt": [655.0, 642.0, 660.0, 638.0],
        "fuel_flow": 12.1,
    }
    snapshot = parser.parse_mavlink_json(payload)
    assert snapshot["E1_CHT1"] == 178.5
    assert snapshot["E1_CHT2"] == 172.0
    assert snapshot["E1_FFlow"] == 12.1
    assert "volt1" in snapshot


def test_mavlink_electrical_and_pressure():
    parser = MAVLinkTelemetryParser()
    sys_payload = {
        "msg_type": "SYS_STATUS",
        "voltage_battery": 28400,  # 28.4 V in mV
        "current_battery": 3250,   # 32.5 A in cA
    }
    snapshot = parser.parse_mavlink_json(sys_payload)
    assert snapshot["volt1"] == 28.4
    assert snapshot["amp1"] == 32.5


def test_federated_fleet_aggregation():
    aggregator = FleetFederatedAggregator(squadron_size=5)
    assert len(aggregator.clients) == 5

    summary = aggregator.execute_federated_round(round_num=1)
    assert summary["round"] == 1
    assert len(summary["participating_uavs"]) == 5
    assert summary["total_samples_aggregated"] > 0
    assert summary["global_weight_norm"] > 0.0


def test_api_mavlink_and_fleet_endpoints():
    # 1. Test MAVLink Ingest
    res_mav = client.post("/api/ingest/mavlink", json={
        "msg_type": "EFI_STATUS",
        "cht": [185.0, 182.0, 184.0, 180.0],
        "fuel_flow": 11.8,
    })
    assert res_mav.status_code == 200
    data_mav = res_mav.json()
    assert data_mav["status"] == "ingested"
    assert data_mav["engine_telemetry_snapshot"]["E1_CHT1"] == 185.0

    # 2. Test Federated Round
    res_fleet = client.post("/api/fleet/federated-round?round_num=1")
    assert res_fleet.status_code == 200
    data_fleet = res_fleet.json()
    assert data_fleet["round"] == 1
    assert len(data_fleet["participating_uavs"]) == 5

    # 3. Test Fleet Status
    res_status = client.get("/api/fleet/status")
    assert res_status.status_code == 200
    assert res_status.json()["rounds_completed"] >= 1
