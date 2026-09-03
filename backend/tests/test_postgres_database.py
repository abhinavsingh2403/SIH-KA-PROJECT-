"""
Unit & Integration Tests for SIH26054 PostgreSQL Database Architecture & Repositories.
"""

import pytest
import json
from backend.database.connection import DatabaseEngineManager, db_manager
from backend.database.models import (
    FlightModel,
    TelemetryLogModel,
    AlertModel,
    FeedbackModel,
    FleetRoundModel,
    MAVLinkPacketModel,
)
from backend.database.repository import PostgresDatabaseRepository


@pytest.fixture(scope='module')
def test_repo():
    repo = PostgresDatabaseRepository(manager=db_manager)
    return repo


def test_db_manager_metrics():
    metrics = db_manager.get_metrics()
    assert 'is_connected' in metrics
    assert 'dialect' in metrics
    assert 'driver' in metrics


def test_flight_crud_operations(test_repo):
    flight_id = 'test_pg_flight_101'
    rec = test_repo.save_flight(
        flight_id=flight_id,
        engine_id='uav_tapas_01',
        profile='patrol',
        duration_s=1200.0,
        num_samples=1200,
        status='active',
    )
    assert rec['flight_id'] == flight_id
    assert rec['engine_id'] == 'uav_tapas_01'
    assert rec['duration_s'] == 1200.0

    # Retrieve single
    fetched = test_repo.get_flight(flight_id)
    assert fetched is not None
    assert fetched['flight_id'] == flight_id

    # Update
    updated = test_repo.save_flight(
        flight_id=flight_id,
        status='completed',
    )
    assert updated['status'] == 'completed'


def test_telemetry_batch_and_queries(test_repo):
    flight_id = 'test_pg_flight_batch_01'
    test_repo.save_flight(flight_id=flight_id, duration_s=100.0)

    packets = [
        {
            'flight_id': flight_id,
            't': float(i),
            'rpm': 2400.0 + i * 5,
            'mission_risk': {'health_score': 98.0 - i * 0.1},
            'stage1_anomaly': i > 15,
            'stage2_fault': 'cylinder_head_overheat' if i > 15 else 'normal',
            'channels': {'E1_CHT1': 160.0 + i, 'E1_OilT': 85.0 + i * 0.2},
        }
        for i in range(20)
    ]

    count = test_repo.save_telemetry_batch(packets)
    assert count == 20

    logs = test_repo.get_telemetry_logs(flight_id=flight_id, limit=50)
    assert len(logs) == 20
    assert logs[0]['timestamp_s'] == 0.0
    assert logs[-1]['timestamp_s'] == 19.0
    assert logs[-1]['stage1_anomaly'] is True


def test_alert_crud_and_filtering(test_repo):
    alert_id = 'test_pg_alert_001'
    flight_id = 'test_pg_flight_alert_01'
    test_repo.save_flight(flight_id=flight_id)

    saved = test_repo.save_alert({
        'alert_id': alert_id,
        'flight_id': flight_id,
        'timestamp': 45.0,
        'fault_type': 'exhaust_valve_leak',
        'confidence': 0.94,
        'severity': 'critical',
        'auto_action_eligible': True,
        'key_sensors': ['E1_EGT3', 'E1_CHT3'],
        'report_text': 'CRITICAL: Exhaust valve leak detected on Cylinder 3.',
    })
    assert saved is True

    alerts = test_repo.get_alerts(flight_id=flight_id, limit=10)
    assert len(alerts) >= 1
    assert alerts[0]['alert_id'] == alert_id
    assert alerts[0]['fault_type'] == 'exhaust_valve_leak'
    assert 'E1_EGT3' in alerts[0]['key_sensors']


def test_operator_feedback(test_repo):
    fb = test_repo.save_feedback(alert_id='alert_123', verdict='true_positive')
    assert fb['alert_id'] == 'alert_123'
    assert fb['verdict'] == 'true_positive'

    records = test_repo.get_feedback_records(limit=10)
    assert any(r['alert_id'] == 'alert_123' for r in records)


def test_fleet_rounds_and_mavlink(test_repo):
    # Fleet round
    summary = {'squadron': 'TAPAS', 'loss': 0.012}
    saved_fleet = test_repo.save_fleet_round(round_num=99, num_clients=6, global_f1=0.985, summary=summary)
    assert saved_fleet is True

    rounds = test_repo.get_fleet_rounds(limit=50)
    assert any(r['round_num'] == 99 for r in rounds)

    # MAVLink log
    saved_mav = test_repo.save_mavlink_packet(
        packet_type='EFI_STATUS',
        raw_payload={'rpm': 2500, 'cht1': 175},
        snapshot={'E1_CHT1': 175.0, 'E1_RPM': 2500.0},
    )
    assert saved_mav is True


def test_table_counts(test_repo):
    counts = test_repo.get_table_counts()
    assert 'flights' in counts
    assert 'telemetry_logs' in counts
    assert 'alerts' in counts
    assert counts['flights'] >= 1
