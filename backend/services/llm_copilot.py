"""
SIH26054 — LLM Report + Pilot Copilot Service
Turns raw model outputs into plain-language explanations and answers
operator questions grounded strictly in flight telemetry.

Strict sequencing: gated BEHIND fault detection/classification.
"""

from __future__ import annotations

from backend.schemas import AlertItem


class LLMCopilotService:
    """Generates grounded debrief reports and handles operator Q&A."""

    def generate_report(self, alert: AlertItem) -> str:
        """
        Generate a concise, high-density 1-2 sentence plain-English operational explanation.
        """
        fault = alert.fault_type.replace("_", " ").title()
        sensors = ", ".join(alert.key_sensors) if alert.key_sensors else "primary channels"
        conf_pct = int(alert.confidence * 100)

        if alert.fault_type == "oil_cooler_degradation":
            return (
                f"Oil temperature rising with simultaneous oil pressure drop detected on {sensors} "
                f"(confidence: {conf_pct}%). Pattern consistent with oil cooler heat exchanger fouling; "
                f"{'immediate RTB recommended' if alert.auto_action_eligible else 'recommend monitoring thermal trend closely'}."
            )
        elif alert.fault_type == "cylinder_head_overheat":
            return (
                f"Localized thermal runaway observed on {sensors} (confidence: {conf_pct}%). "
                f"Cylinder head temperature exceeding nominal margin; recommend reducing throttle to 55% "
                f"and planning precautionary landing."
            )
        elif alert.fault_type == "exhaust_valve_leak":
            return (
                f"Exhaust gas temperature deficit and cyclic oscillation detected on {sensors} "
                f"(confidence: {conf_pct}%). Indicates exhaust valve sealing degradation; inspect valve seat before next sortie."
            )
        elif alert.fault_type == "alternator_rectifier_drift":
            return (
                f"Primary electrical bus voltage sag with current imbalance detected across {sensors} "
                f"(confidence: {conf_pct}%). Rectifier diode degradation suspected; non-essential avionics load shedding advised."
            )
        elif alert.fault_type == "fuel_flow_oscillation":
            return (
                f"Fuel flow hunting and pressure oscillation observed on {sensors} (confidence: {conf_pct}%). "
                f"Consistent with fuel metering servo unit stick-slip; check fuel filter and servo valve on turnaround."
            )
        elif alert.fault_type == "unknown_pattern":
            return (
                f"Anomalous telemetry signature detected across {sensors} with low classifier certainty "
                f"({conf_pct}%). Out-of-distribution pattern flagged for manual engineering review."
            )
        else:
            return (
                f"{fault} detected on {sensors} at T+{alert.timestamp:.0f}s with {conf_pct}% confidence. "
                f"Severity: {alert.severity.value.upper()}."
            )

    def answer_copilot_query(
        self,
        flight_id: str,
        message: str,
        active_alerts: list[AlertItem],
        health_score: float = 85.0,
    ) -> str:
        """
        Grounded flight copilot answering operator inquiries.
        """
        msg_lower = message.lower()

        if "safe" in msg_lower or "fly" in msg_lower or "tomorrow" in msg_lower:
            if health_score < 40 or any(a.severity.value == "critical" for a in active_alerts):
                return (
                    f"Flight {flight_id} is NOT cleared for further sorties. Current engine health is "
                    f"{health_score}/100 with critical active alerts ({', '.join(a.fault_type for a in active_alerts)}). "
                    f"Mandatory maintenance inspection required before release."
                )
            else:
                return (
                    f"Engine health score is {health_score}/100. Minor warnings exist, but within operational "
                    f"flight envelop tolerances. Pre-flight run-up verification recommended."
                )

        if "why" in msg_lower or "flag" in msg_lower or "cause" in msg_lower:
            if not active_alerts:
                return f"Flight {flight_id} telemetry has not triggered any active anomaly flags. All 15 channels nominal."
            top_alert = active_alerts[0]
            return (
                f"Flagged due to {top_alert.fault_type.replace('_', ' ')} on {', '.join(top_alert.key_sensors)} "
                f"with {int(top_alert.confidence * 100)}% model certainty. "
                f"{top_alert.report_text or self.generate_report(top_alert)}"
            )

        if "sensor" in msg_lower or "channel" in msg_lower:
            affected = set()
            for a in active_alerts:
                affected.update(a.key_sensors)
            return (
                f"Active affected sensors on Flight {flight_id}: "
                f"{', '.join(affected) if affected else 'None (all channels healthy)'}."
            )

        # Default grounded response
        return (
            f"Flight {flight_id} Status: Health Score {health_score}/100 | "
            f"Active Alerts: {len(active_alerts)} | Recommendation: "
            f"{'RTB' if health_score < 40 else 'Caution' if health_score < 70 else 'Nominal'}."
        )
