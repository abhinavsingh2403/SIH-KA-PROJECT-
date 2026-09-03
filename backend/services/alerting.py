"""
SIH26054 — Decision & Alerting Layer
Converts Stage 1 & Stage 2 model outputs and Digital Twin residual trends
into prioritized, ranked alerts.

Strict Safety Rule (Hard-Coded from config):
  IF confidence >= AUTO_ACTION_CONFIDENCE_THRESHOLD (0.90):
      -> auto_action_eligible = True ("Recommend RTB / Throttle Reduction")
  ELSE:
      -> auto_action_eligible = False (Alert-only, strictly requires human confirmation)
"""

from __future__ import annotations

import uuid
from backend.config import AUTO_ACTION_CONFIDENCE_THRESHOLD
from backend.schemas import AlertItem, AlertSeverity


class DecisionAlertingEngine:
    """Decision logic and safety threshold enforcement."""

    def __init__(self, auto_threshold: float = AUTO_ACTION_CONFIDENCE_THRESHOLD):
        self.auto_threshold = auto_threshold

    def evaluate_alert(
        self,
        flight_id: str,
        timestamp: float,
        fault_type: str,
        stage1_confidence: float,
        stage2_confidence: float,
        max_residual_slope: float = 0.0,
        key_sensors: list[str] | None = None,
        report_text: str | None = None,
    ) -> AlertItem:
        """
        Evaluate inputs and return a structured, ranked AlertItem.
        """
        if key_sensors is None:
            key_sensors = []

        # Combined severity metric:
        # 0.3 * Stage 1 confidence + 0.4 * Stage 2 confidence + 0.3 * slope factor
        slope_factor = min(1.0, max(0.0, max_residual_slope * 5.0))
        composite_score = (
            0.3 * stage1_confidence +
            0.4 * stage2_confidence +
            0.3 * slope_factor
        )

        if composite_score >= 0.75:
            severity = AlertSeverity.critical
        elif composite_score >= 0.45:
            severity = AlertSeverity.warning
        else:
            severity = AlertSeverity.info

        # Auditable safety rule
        auto_action_eligible = bool(stage2_confidence >= self.auto_threshold)

        return AlertItem(
            alert_id=f"alert_{uuid.uuid4().hex[:10]}",
            flight_id=flight_id,
            timestamp=timestamp,
            fault_type=fault_type,
            confidence=float(stage2_confidence),
            severity=severity,
            auto_action_eligible=auto_action_eligible,
            key_sensors=key_sensors,
            report_text=report_text,
        )
