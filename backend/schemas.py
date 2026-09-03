"""
SIH26054 — Pydantic v2 Schemas
Request/response contracts for all backend API endpoints.
"""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


# ─── Enums ──────────────────────────────────────────────────────────────────────

class FlightProfile(str, Enum):
    patrol = "patrol"
    climb = "climb"
    cruise = "cruise"


class FaultType(str, Enum):
    oil_cooler_degradation = "oil_cooler_degradation"
    cylinder_head_overheat = "cylinder_head_overheat"
    exhaust_valve_leak = "exhaust_valve_leak"
    alternator_rectifier_drift = "alternator_rectifier_drift"
    fuel_flow_oscillation = "fuel_flow_oscillation"


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class FeedbackVerdict(str, Enum):
    true_positive = "true_positive"
    false_positive = "false_positive"
    missed_fault = "missed_fault"


# ─── 2.1 Data Simulator ────────────────────────────────────────────────────────

class FlightSimulationRequest(BaseModel):
    duration_minutes: int = Field(60, ge=1, le=480, description="Flight duration in minutes")
    profile: FlightProfile = FlightProfile.patrol
    engine_id: str = Field("engine_001", description="Unique engine identifier")


class FlightSimulationResponse(BaseModel):
    flight_id: str
    engine_id: str
    duration_seconds: int
    profile: FlightProfile
    num_channels: int = 15
    num_samples: int
    data_path: str  # path to generated CSV


# ─── 2.2 Fault Injection ───────────────────────────────────────────────────────

class FaultInjectionRequest(BaseModel):
    flight_id: str
    fault_type: FaultType
    onset_time_pct: float = Field(0.3, ge=0.0, le=0.95, description="Fault onset as fraction of flight [0..1)")
    severity: float = Field(0.5, ge=0.1, le=1.0, description="Severity multiplier (0.1=subtle, 1.0=extreme)")
    target_cylinder: int | None = Field(None, ge=1, le=4, description="For per-cylinder faults, which cylinder (1-4)")


class FaultInjectionResponse(BaseModel):
    fault_id: str
    flight_id: str
    fault_type: FaultType
    onset_time_pct: float
    severity: float
    affected_channels: list[str]
    target_cylinder: int | None = None


# ─── 2.3 Stage 1 — Edge Anomaly Detection ──────────────────────────────────────

class Stage1CheckRequest(BaseModel):
    flight_id: str
    window_start: float = Field(description="Window start time in seconds")
    window_end: float = Field(description="Window end time in seconds")
    sensor_data: dict[str, list[float]] = Field(description="Channel name → list of values in window")


class Stage1CheckResponse(BaseModel):
    is_anomalous: bool
    confidence: float = Field(ge=0.0, le=1.0)


# ─── 2.4 Stage 2 — Ground Fault Classification ─────────────────────────────────

class Stage2ClassifyResponse(BaseModel):
    fault_type: str  # FaultType value or "unknown_pattern"
    confidence: float = Field(ge=0.0, le=1.0)
    key_sensors: list[str]
    key_time_range: tuple[float, float]


# ─── 2.5 Digital Twin Residuals ─────────────────────────────────────────────────

class ResidualPoint(BaseModel):
    t: float
    expected: float
    actual: float
    residual: float


class ResidualsResponse(BaseModel):
    flight_id: str
    channels: dict[str, list[ResidualPoint]]


# ─── 2.6 Decision & Alerting ───────────────────────────────────────────────────

class AlertItem(BaseModel):
    alert_id: str
    flight_id: str
    timestamp: float
    fault_type: str
    confidence: float
    severity: AlertSeverity
    auto_action_eligible: bool
    key_sensors: list[str] = []
    report_text: str | None = None


# ─── 2.7 LLM Report + Copilot ──────────────────────────────────────────────────

class ReportGenerateRequest(BaseModel):
    alert_id: str


class ReportGenerateResponse(BaseModel):
    report_text: str


class CopilotChatRequest(BaseModel):
    flight_id: str
    message: str
    conversation_history: list[dict[str, str]] = []


class CopilotChatResponse(BaseModel):
    reply: str


# ─── 2.8 Mission-Risk Scorer ───────────────────────────────────────────────────

class MissionRiskResponse(BaseModel):
    flight_id: str
    health_score: float = Field(ge=0.0, le=100.0)
    recommendation: str


class WhatIfRequest(BaseModel):
    engine_id: str
    planned_duration_minutes: int = Field(ge=1)


class WhatIfResponse(BaseModel):
    survivable: bool
    safe_duration_estimate: int  # minutes
    recommendation: str


# ─── 2.9 Black-Box Replay ──────────────────────────────────────────────────────

class ReplayEvent(BaseModel):
    t: float
    channel_values: dict[str, float]
    alerts: list[AlertItem] = []


# ─── 2.10 Feedback ─────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    alert_id: str
    verdict: FeedbackVerdict


class AccuracyTrendPoint(BaseModel):
    flight_id: str
    accuracy_pct: float


# ─── Sensor Reading (shared) ───────────────────────────────────────────────────

class SensorReading(BaseModel):
    """Single timestep across all 15 channels."""
    timestamp: float
    volt1: float
    volt2: float
    amp1: float
    amp2: float
    E1_FFlow: float
    E1_OilT: float
    E1_OilP: float
    E1_CHT1: float
    E1_CHT2: float
    E1_CHT3: float
    E1_CHT4: float
    E1_EGT1: float
    E1_EGT2: float
    E1_EGT3: float
    E1_EGT4: float
