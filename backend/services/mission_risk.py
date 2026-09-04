"""
SIH26054 — Mission-Risk Scorer & What-If Engine
Directly addresses "Mission Reliability" from the DRDO problem statement.

Rule-based transparent scoring:
  health_score = 100 - Σ(alert_penalties) - trend_penalty
  IF health_score < MISSION_RISK_ABORT_THRESHOLD (40):
      "Recommend abort / return to base"
  IF 40 <= health_score < MISSION_RISK_CAUTION_THRESHOLD (70):
      "Continue with caution, shorten mission if possible"
  ELSE:
      "Continue mission normally"

What-if Mode:
  Extrapolates current health degradation forward across a planned mission duration.
  Estimates safe flight duration in minutes before health drops below abort threshold.
"""

from __future__ import annotations

from backend.config import (
    MISSION_RISK_ABORT_THRESHOLD,
    MISSION_RISK_CAUTION_THRESHOLD,
)
from backend.schemas import AlertItem, AlertSeverity, MissionRiskResponse, WhatIfResponse


class MissionRiskScorer:
    """Computes mission-level health score and what-if forward survivability."""

    def __init__(
        self,
        abort_thresh: float = MISSION_RISK_ABORT_THRESHOLD,
        caution_thresh: float = MISSION_RISK_CAUTION_THRESHOLD,
    ):
        self.abort_thresh = abort_thresh
        self.caution_thresh = caution_thresh

    def score_flight(self, flight_id: str, alerts: list[AlertItem], max_trend_slope: float = 0.0) -> MissionRiskResponse:
        """
        Compute live mission health score and operational recommendation.
        """
        score = 100.0

        # Specific calibrated FMEA degradation penalties matching digital twin physics
        fault_penalties = {
            "oil_cooler_degradation": 42.0,      # Yields 58.0% (Warning)
            "cylinder_head_overheat": 48.0,      # Yields 52.0% (Critical)
            "alternator_rectifier_drift": 36.0,  # Yields 64.0% (Caution)
            "fuel_flow_oscillation": 32.0,       # Yields 68.0% (Caution)
        }

        for alert in alerts:
            if alert.fault_type in fault_penalties:
                score -= fault_penalties[alert.fault_type]
            elif alert.severity == AlertSeverity.critical:
                score -= 30.0
            elif alert.severity == AlertSeverity.warning:
                score -= 15.0
            else:
                score -= 5.0

        # Penalize growing divergence trends
        score -= min(25.0, max(0.0, max_trend_slope * 15.0))
        score = max(0.0, min(100.0, score))

        if score < self.abort_thresh:
            recommendation = "CRITICAL: Recommend abort / immediate return to base (RTB)."
        elif score < self.caution_thresh:
            recommendation = "CAUTION: Continue mission with vigilance; shorten sortie if feasible."
        else:
            recommendation = "NOMINAL: Engine health within acceptable parameters; continue mission."

        return MissionRiskResponse(
            flight_id=flight_id,
            health_score=round(score, 1),
            recommendation=recommendation,
        )

    def what_if_analysis(
        self,
        engine_id: str,
        planned_duration_minutes: int,
        current_health_score: float = 85.0,
        degradation_rate_per_min: float = 0.35,
    ) -> WhatIfResponse:
        """
        Simulate engine health evolution forward across planned sortie duration.
        """
        projected_final_score = current_health_score - (degradation_rate_per_min * planned_duration_minutes)

        survivable = projected_final_score >= self.abort_thresh

        if degradation_rate_per_min > 0:
            safe_minutes = max(0, int((current_health_score - self.abort_thresh) / degradation_rate_per_min))
        else:
            safe_minutes = planned_duration_minutes

        if survivable:
            recommendation = (
                f"Sortie viable. Projected engine health at T+{planned_duration_minutes}m: "
                f"{projected_final_score:.1f}/100. Safe to proceed."
            )
        else:
            recommendation = (
                f"High risk. Engine projected to breach abort threshold at T+{safe_minutes}m. "
                f"Recommend capping mission to {max(15, safe_minutes - 10)} minutes or aborting."
            )

        return WhatIfResponse(
            survivable=survivable,
            safe_duration_estimate=safe_minutes,
            recommendation=recommendation,
        )
