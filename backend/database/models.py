"""
SIH26054 PostgreSQL SQLAlchemy Declarative ORM Models
Defines tables for flights, telemetry streams, FMEA alerts, feedback, federated fleet rounds, and MAVLink logs.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json

from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Text,
    DateTime,
    Index,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _utcnow_str() -> str:
    return datetime.now(timezone.utc).isoformat() + 'Z'


class FlightModel(Base):
    __tablename__ = 'flights'

    flight_id = Column(String(64), primary_key=True, index=True)
    engine_id = Column(String(64), nullable=False, default='engine_001')
    profile = Column(String(32), nullable=False, default='patrol')
    duration_s = Column(Float, nullable=False, default=600.0)
    num_samples = Column(Integer, nullable=False, default=600)
    status = Column(String(32), nullable=False, default='completed')
    created_at = Column(String(64), nullable=False, default=_utcnow_str)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'flight_id': self.flight_id,
            'engine_id': self.engine_id,
            'profile': self.profile,
            'duration_s': self.duration_s,
            'num_samples': self.num_samples,
            'status': self.status,
            'created_at': self.created_at,
        }


class TelemetryLogModel(Base):
    __tablename__ = 'telemetry_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    flight_id = Column(String(64), index=True, nullable=False)
    timestamp_s = Column(Float, nullable=False)
    rpm = Column(Float, nullable=False, default=2400.0)
    health_score = Column(Float, nullable=False, default=100.0)
    stage1_anomaly = Column(Boolean, nullable=False, default=False)
    stage2_fault = Column(String(64), nullable=False, default='normal')
    channels_json = Column(Text, nullable=False, default='{}')
    created_at = Column(String(64), nullable=False, default=_utcnow_str)

    __table_args__ = (
        Index('idx_telemetry_flight_ts', 'flight_id', 'timestamp_s'),
    )

    def to_dict(self) -> Dict[str, Any]:
        channels = {}
        try:
            channels = json.loads(self.channels_json) if self.channels_json else {}
        except Exception:
            pass
        return {
            'id': self.id,
            'flight_id': self.flight_id,
            'timestamp_s': self.timestamp_s,
            'rpm': self.rpm,
            'health_score': self.health_score,
            'stage1_anomaly': self.stage1_anomaly,
            'stage2_fault': self.stage2_fault,
            'channels': channels,
            'created_at': self.created_at,
        }


class AlertModel(Base):
    __tablename__ = 'alerts'

    alert_id = Column(String(64), primary_key=True, index=True)
    flight_id = Column(String(64), index=True, nullable=False)
    timestamp_s = Column(Float, nullable=False)
    fault_type = Column(String(64), nullable=False)
    confidence = Column(Float, nullable=False, default=0.95)
    severity = Column(String(32), nullable=False, default='warning')
    auto_action_eligible = Column(Boolean, nullable=False, default=False)
    key_sensors_json = Column(Text, nullable=False, default='[]')
    report_text = Column(Text, nullable=True)
    created_at = Column(String(64), nullable=False, default=_utcnow_str)

    def to_dict(self) -> Dict[str, Any]:
        key_sensors = []
        try:
            key_sensors = json.loads(self.key_sensors_json) if self.key_sensors_json else []
        except Exception:
            pass
        return {
            'alert_id': self.alert_id,
            'flight_id': self.flight_id,
            'timestamp_s': self.timestamp_s,
            'fault_type': self.fault_type,
            'confidence': self.confidence,
            'severity': self.severity,
            'auto_action_eligible': self.auto_action_eligible,
            'key_sensors': key_sensors,
            'report_text': self.report_text or '',
            'created_at': self.created_at,
        }


class FeedbackModel(Base):
    __tablename__ = 'operator_feedback'

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(64), nullable=False, index=True)
    verdict = Column(String(32), nullable=False)
    created_at = Column(String(64), nullable=False, default=_utcnow_str)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'alert_id': self.alert_id,
            'verdict': self.verdict,
            'created_at': self.created_at,
        }


class FleetRoundModel(Base):
    __tablename__ = 'fleet_rounds'

    round_num = Column(Integer, primary_key=True)
    num_clients = Column(Integer, nullable=False, default=5)
    global_f1 = Column(Float, nullable=False)
    summary_json = Column(Text, nullable=False, default='{}')
    created_at = Column(String(64), nullable=False, default=_utcnow_str)

    def to_dict(self) -> Dict[str, Any]:
        summary = {}
        try:
            summary = json.loads(self.summary_json) if self.summary_json else {}
        except Exception:
            pass
        return {
            'round_num': self.round_num,
            'num_clients': self.num_clients,
            'global_f1': self.global_f1,
            'summary': summary,
            'created_at': self.created_at,
        }


class MAVLinkPacketModel(Base):
    __tablename__ = 'mavlink_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    packet_type = Column(String(64), nullable=False, default='MAVLink')
    raw_payload_json = Column(Text, nullable=False, default='{}')
    snapshot_json = Column(Text, nullable=False, default='{}')
    created_at = Column(String(64), nullable=False, default=_utcnow_str)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'packet_type': self.packet_type,
            'created_at': self.created_at,
        }
