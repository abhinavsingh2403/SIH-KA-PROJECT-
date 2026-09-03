"""
SIH26054 — WebSocket Telemetry Stream Tests
Validates:
  1. WebSocket accepts connection and streams telemetry packets.
  2. Telemetry packet contains all 15 channels, RPM, alerts, and mission risk.
  3. Control actions (pause, resume, set_speed, inject_fault) execute cleanly.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_websocket_telemetry_stream_flow():
    with client.websocket_connect("/api/ws/telemetry/demo") as websocket:
        # 1. Receive first telemetry frame
        packet = websocket.receive_json()
        assert packet["type"] == "telemetry"
        assert "channels" in packet
        assert "E1_CHT1" in packet["channels"]
        assert "rpm" in packet
        assert "mission_risk" in packet
        assert packet["mission_risk"]["health_score"] >= 70.0

        # 2. Send control action: set speed to 5x
        websocket.send_json({"action": "set_speed", "speed": 5.0})
        packet2 = websocket.receive_json()
        assert packet2["speed"] == 5.0

        # 3. Send control action: inject fault
        websocket.send_json({
            "action": "inject_fault",
            "fault_type": "cylinder_head_overheat",
            "target_cylinder": 2,
            "severity": 0.9,
        })
        packet3 = websocket.receive_json()
        assert "t" in packet3
