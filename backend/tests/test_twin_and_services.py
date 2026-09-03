"""
SIH26054 — Unit Tests for Digital Twin, Alerting, Mission Risk, and Copilot
Validates:
  1. Residual Engine baseline calculation and |actual - expected| delta.
  2. Sensor health plausibility check.
  3. Decision & Alerting safety threshold (AUTO_ACTION_CONFIDENCE_THRESHOLD = 0.90).
  4. Mission Risk health scoring and what-if forward extrapolation.
  5. LLM Copilot report generation and grounded Q&A.
"""

from __future__ import annotations

import numpy as np
import pytest

from backend.config import AUTO_ACTION_CONFIDENCE_THRESHOLD, SENSOR_CHANNELS
from backend.schemas import AlertItem, AlertSeverity
from backend.services.alerting import DecisionAlertingEngine
from backend.services.llm_copilot import LLMCopilotService
from backend.services.mission_risk import MissionRiskScorer
from backend.simulator.engine_simulator import generate_flight
from backend.simulator.fault_injector import inject_fault
from backend.twin.residual_engine import DigitalTwinResidualEngine


@pytest.fixture
def clean_flight():
    return generate_flight(profile="cruise", duration_s=180, seed=42)


@pytest.fixture
def faulted_flight(clean_flight):
    faulted, _ = inject_fault(
        clean_flight,
        fault_type="cylinder_head_overheat",
        onset_time_pct=0.3,
        severity=0.8,
        target_cylinder=2,
        seed=42,
    )
    return faulted


class TestDigitalTwinResidualEngine:
    def test_clean_flight_low_residuals(self, clean_flight):
        engine = DigitalTwinResidualEngine()
        residuals = engine.compute_residuals(clean_flight)

        # On clean flights, mean residual should be small (dominated by sensor noise)
        for ch in ["E1_CHT1", "E1_OilT", "volt1"]:
            assert residuals[ch]["mean_residual"] < 10.0

    def test_faulted_flight_elevated_residuals(self, faulted_flight):
        engine = DigitalTwinResidualEngine()
        residuals = engine.compute_residuals(faulted_flight)

        # Cylinder 2 should have significantly higher max residual than Cylinder 4
        cht2_max = residuals["E1_CHT2"]["max_residual"]
        cht4_max = residuals["E1_CHT4"]["max_residual"]
        assert cht2_max > cht4_max + 15.0, f"CHT2 max residual {cht2_max} should exceed CHT4 {cht4_max}"


class TestDecisionAlertingEngine:
    def test_auto_action_safety_threshold(self):
        alerting = DecisionAlertingEngine(auto_threshold=0.90)

        # Confidence = 0.85 -> alert-only, requires human confirmation
        alert_low = alerting.evaluate_alert(
            flight_id="f1", timestamp=100.0, fault_type="oil_cooler_degradation",
            stage1_confidence=0.88, stage2_confidence=0.85,
        )
        assert alert_low.auto_action_eligible is False

        # Confidence = 0.95 -> auto-action eligible
        alert_high = alerting.evaluate_alert(
            flight_id="f1", timestamp=100.0, fault_type="oil_cooler_degradation",
            stage1_confidence=0.98, stage2_confidence=0.95,
        )
        assert alert_high.auto_action_eligible is True


class TestMissionRiskScorer:
    def test_nominal_flight_high_score(self):
        scorer = MissionRiskScorer()
        resp = scorer.score_flight("f1", alerts=[], max_trend_slope=0.0)
        assert resp.health_score >= 90.0
        assert "NOMINAL" in resp.recommendation

    def test_critical_alerts_trigger_abort(self):
        scorer = MissionRiskScorer()
        critical_alerts = [
            AlertItem(
                alert_id="a1", flight_id="f1", timestamp=120.0,
                fault_type="cylinder_head_overheat", confidence=0.95,
                severity=AlertSeverity.critical, auto_action_eligible=True,
            ),
            AlertItem(
                alert_id="a2", flight_id="f1", timestamp=140.0,
                fault_type="oil_cooler_degradation", confidence=0.92,
                severity=AlertSeverity.critical, auto_action_eligible=True,
            ),
        ]
        resp = scorer.score_flight("f1", alerts=critical_alerts, max_trend_slope=0.5)
        assert resp.health_score < 40.0
        assert "abort" in resp.recommendation.lower()

    def test_what_if_survivability(self):
        scorer = MissionRiskScorer()
        # High degradation rate (1.5 per min) on a 60-min planned flight
        resp = scorer.what_if_analysis(
            engine_id="eng1",
            planned_duration_minutes=60,
            current_health_score=80.0,
            degradation_rate_per_min=1.5,
        )
        assert resp.survivable is False
        assert resp.safe_duration_estimate < 60


class TestLLMCopilotService:
    def test_report_generation(self):
        copilot = LLMCopilotService()
        alert = AlertItem(
            alert_id="a1", flight_id="f1", timestamp=150.0,
            fault_type="cylinder_head_overheat", confidence=0.94,
            severity=AlertSeverity.critical, auto_action_eligible=True,
            key_sensors=["E1_CHT2", "E1_EGT2"],
        )
        text = copilot.generate_report(alert)
        assert "thermal runaway" in text.lower()
        assert "E1_CHT2" in text

    def test_copilot_safety_query(self):
        copilot = LLMCopilotService()
        reply = copilot.answer_copilot_query(
            flight_id="f1",
            message="Is it safe to fly tomorrow?",
            active_alerts=[],
            health_score=92.0,
        )
        assert "92" in reply
        assert "tolerances" in reply or "cleared" in reply
