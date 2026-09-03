"""
SIH26054 PostgreSQL Data Access Object & Repository Layer
Provides transactional CRUD interfaces for Flights, Telemetry Streams, Alerts, Fleet Rounds, and MAVLink logs.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func, desc
from backend.database.connection import db_manager, DatabaseEngineManager
from backend.database.models import (
    FlightModel,
    TelemetryLogModel,
    AlertModel,
    FeedbackModel,
    FleetRoundModel,
    MAVLinkPacketModel,
)


class PostgresDatabaseRepository:
    """High-performance data repository leveraging PostgreSQL connection pooling and ORM queries."""

    def __init__(self, manager: Optional[DatabaseEngineManager] = None):
        self.manager = manager or db_manager

    # ─── Flights ─────────────────────────────────────────────────────────────

    def save_flight(
        self,
        flight_id: str,
        engine_id: str = 'engine_001',
        profile: str = 'patrol',
        duration_s: float = 600.0,
        num_samples: int = 600,
        status: str = 'completed',
    ) -> Dict[str, Any]:
        with self.manager.get_session() as session:
            existing = session.get(FlightModel, flight_id)
            if existing:
                existing.engine_id = engine_id
                existing.profile = profile
                existing.duration_s = duration_s
                existing.num_samples = num_samples
                existing.status = status
                session.flush()
                return existing.to_dict()
            else:
                flight = FlightModel(
                    flight_id=flight_id,
                    engine_id=engine_id,
                    profile=profile,
                    duration_s=duration_s,
                    num_samples=num_samples,
                    status=status,
                )
                session.add(flight)
                session.flush()
                return flight.to_dict()

    def get_flight(self, flight_id: str) -> Optional[Dict[str, Any]]:
        with self.manager.get_session() as session:
            flight = session.get(FlightModel, flight_id)
            return flight.to_dict() if flight else None

    def get_flights(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.manager.get_session() as session:
            stmt = select(FlightModel).order_by(desc(FlightModel.created_at)).limit(limit)
            result = session.execute(stmt).scalars().all()
            return [f.to_dict() for f in result]

    # ─── Telemetry Logs ──────────────────────────────────────────────────────

    def save_telemetry_packet(self, packet: Dict[str, Any]) -> bool:
        flight_id = str(packet.get('flight_id', 'flight_demo'))
        t = float(packet.get('t', 0.0))
        rpm = float(packet.get('rpm', 2400.0))
        risk = packet.get('mission_risk', {})
        health_score = float(risk.get('health_score', 100.0) if isinstance(risk, dict) else 100.0)
        is_anom = bool(packet.get('stage1_anomaly', False))
        fault = str(packet.get('stage2_fault', 'normal'))
        channels = packet.get('channels', {})
        channels_json = json.dumps(channels)

        with self.manager.get_session() as session:
            log = TelemetryLogModel(
                flight_id=flight_id,
                timestamp_s=t,
                rpm=rpm,
                health_score=health_score,
                stage1_anomaly=is_anom,
                stage2_fault=fault,
                channels_json=channels_json,
            )
            session.add(log)
            session.flush()
            return True

    def save_telemetry_batch(self, packets: List[Dict[str, Any]]) -> int:
        """High-speed bulk telemetry ingestion."""
        if not packets:
            return 0
        models = []
        for p in packets:
            models.append(
                TelemetryLogModel(
                    flight_id=str(p.get('flight_id', 'flight_demo')),
                    timestamp_s=float(p.get('t', 0.0)),
                    rpm=float(p.get('rpm', 2400.0)),
                    health_score=float(p.get('mission_risk', {}).get('health_score', 100.0) if isinstance(p.get('mission_risk'), dict) else 100.0),
                    stage1_anomaly=bool(p.get('stage1_anomaly', False)),
                    stage2_fault=str(p.get('stage2_fault', 'normal')),
                    channels_json=json.dumps(p.get('channels', {})),
                )
            )
        with self.manager.get_session() as session:
            session.add_all(models)
            session.flush()
            return len(models)

    def get_telemetry_logs(self, flight_id: str, limit: int = 300) -> List[Dict[str, Any]]:
        with self.manager.get_session() as session:
            stmt = (
                select(TelemetryLogModel)
                .where(TelemetryLogModel.flight_id == flight_id)
                .order_by(TelemetryLogModel.timestamp_s)
                .limit(limit)
            )
            logs = session.execute(stmt).scalars().all()
            return [l.to_dict() for l in logs]

    # ─── Alerts ──────────────────────────────────────────────────────────────

    def save_alert(self, alert_data: Dict[str, Any]) -> bool:
        alert_id = str(alert_data.get('alert_id', f"alert_{int(datetime.now(timezone.utc).timestamp())}"))
        flight_id = str(alert_data.get('flight_id', 'flight_demo'))
        ts = float(alert_data.get('timestamp', alert_data.get('timestamp_s', 0.0)))
        fault = str(alert_data.get('fault_type', 'normal'))
        conf = float(alert_data.get('confidence', 0.95))
        sev = alert_data.get('severity', 'warning')
        if isinstance(sev, dict):
            sev = sev.get('value', 'warning')
        sev = str(sev)
        auto_act = bool(alert_data.get('auto_action_eligible', False))
        key_sensors = alert_data.get('key_sensors', [])
        key_sensors_json = json.dumps(key_sensors)
        report_text = alert_data.get('report_text', '')

        with self.manager.get_session() as session:
            existing = session.get(AlertModel, alert_id)
            if existing:
                existing.flight_id = flight_id
                existing.timestamp_s = ts
                existing.fault_type = fault
                existing.confidence = conf
                existing.severity = sev
                existing.auto_action_eligible = auto_act
                existing.key_sensors_json = key_sensors_json
                existing.report_text = report_text
            else:
                new_alert = AlertModel(
                    alert_id=alert_id,
                    flight_id=flight_id,
                    timestamp_s=ts,
                    fault_type=fault,
                    confidence=conf,
                    severity=sev,
                    auto_action_eligible=auto_act,
                    key_sensors_json=key_sensors_json,
                    report_text=report_text,
                )
                session.add(new_alert)
            session.flush()
            return True

    def get_alerts(self, flight_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        with self.manager.get_session() as session:
            stmt = select(AlertModel).order_by(desc(AlertModel.created_at)).limit(limit)
            if flight_id:
                stmt = stmt.where(AlertModel.flight_id == flight_id)
            alerts = session.execute(stmt).scalars().all()
            return [a.to_dict() for a in alerts]

    # ─── Operator Feedback ───────────────────────────────────────────────────

    def save_feedback(self, alert_id: str, verdict: str) -> Dict[str, Any]:
        with self.manager.get_session() as session:
            fb = FeedbackModel(alert_id=alert_id, verdict=verdict)
            session.add(fb)
            session.flush()
            return fb.to_dict()

    def get_feedback_records(self, limit: int = 100) -> List[Dict[str, Any]]:
        with self.manager.get_session() as session:
            stmt = select(FeedbackModel).order_by(desc(FeedbackModel.created_at)).limit(limit)
            rows = session.execute(stmt).scalars().all()
            return [r.to_dict() for r in rows]

    # ─── Federated Rounds ────────────────────────────────────────────────────

    def save_fleet_round(self, round_num: int, num_clients: int, global_f1: float, summary: Dict[str, Any]) -> bool:
        with self.manager.get_session() as session:
            existing = session.get(FleetRoundModel, round_num)
            if existing:
                existing.num_clients = num_clients
                existing.global_f1 = global_f1
                existing.summary_json = json.dumps(summary)
            else:
                round_rec = FleetRoundModel(
                    round_num=round_num,
                    num_clients=num_clients,
                    global_f1=global_f1,
                    summary_json=json.dumps(summary),
                )
                session.add(round_rec)
            session.flush()
            return True

    def get_fleet_rounds(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self.manager.get_session() as session:
            stmt = select(FleetRoundModel).order_by(FleetRoundModel.round_num).limit(limit)
            rounds = session.execute(stmt).scalars().all()
            return [r.to_dict() for r in rounds]

    # ─── MAVLink Ingestion Logs ──────────────────────────────────────────────

    def save_mavlink_packet(self, packet_type: str, raw_payload: Dict[str, Any], snapshot: Dict[str, Any]) -> bool:
        with self.manager.get_session() as session:
            log = MAVLinkPacketModel(
                packet_type=packet_type,
                raw_payload_json=json.dumps(raw_payload),
                snapshot_json=json.dumps(snapshot),
            )
            session.add(log)
            session.flush()
            return True

    # ─── Statistics & Metrics ────────────────────────────────────────────────

    def get_table_counts(self) -> Dict[str, int]:
        counts = {}
        with self.manager.get_session() as session:
            for name, model in [
                ('flights', FlightModel),
                ('telemetry_logs', TelemetryLogModel),
                ('alerts', AlertModel),
                ('operator_feedback', FeedbackModel),
                ('fleet_rounds', FleetRoundModel),
                ('mavlink_logs', MAVLinkPacketModel),
            ]:
                try:
                    c = session.scalar(select(func.count()).select_from(model))
                    counts[name] = c or 0
                except Exception:
                    counts[name] = 0
        return counts


# Global repository singleton
postgres_repo = PostgresDatabaseRepository()
