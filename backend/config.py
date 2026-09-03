"""
SIH26054 — Auditable Configuration Constants
AI-Enabled Real-Time Digital Twin for Aero Piston Engine Health Monitoring (MALE UAV)

All thresholds and operational parameters are surfaced here as named constants.
Never bury these in business logic — they must be auditable by DRDO reviewers.
"""

from __future__ import annotations

# ─── Safety & Decision Thresholds ───────────────────────────────────────────────
AUTO_ACTION_CONFIDENCE_THRESHOLD = 0.90    # ≥ this → auto-action recommendation eligible
UNKNOWN_FAULT_CONFIDENCE_THRESHOLD = 0.60  # < this → classify as "unknown_pattern"
STAGE1_WINDOW_SECONDS = 90                 # rolling edge-detection window

MISSION_RISK_ABORT_THRESHOLD = 40          # < 40 → Recommend Abort / Return To Base
MISSION_RISK_CAUTION_THRESHOLD = 70        # 40–70 → Continue with caution

# ─── Sensor Channel Definitions ─────────────────────────────────────────────────
# The 15 diagnostically valuable channels per LiteInception (arXiv:2604.01725)
SENSOR_CHANNELS: list[str] = [
    "volt1", "volt2", "amp1", "amp2",
    "E1_FFlow",
    "E1_OilT", "E1_OilP",
    "E1_CHT1", "E1_CHT2", "E1_CHT3", "E1_CHT4",
    "E1_EGT1", "E1_EGT2", "E1_EGT3", "E1_EGT4",
]

# ─── Nominal Operating Bands (used by Digital Twin residual engine) ─────────────
# Format: channel → (min_nominal, max_nominal, unit)
NOMINAL_BANDS: dict[str, tuple[float, float, str]] = {
    "volt1":    (27.0,  29.5,  "V"),
    "volt2":    (27.0,  29.5,  "V"),
    "amp1":     (20.0,  60.0,  "A"),
    "amp2":     (20.0,  60.0,  "A"),
    "E1_FFlow": (8.0,   18.0,  "gal/hr"),
    "E1_OilT":  (65.0,  120.0, "°C"),
    "E1_OilP":  (40.0,  80.0,  "psi"),
    "E1_CHT1":  (120.0, 240.0, "°C"),
    "E1_CHT2":  (120.0, 240.0, "°C"),
    "E1_CHT3":  (120.0, 240.0, "°C"),
    "E1_CHT4":  (120.0, 240.0, "°C"),
    "E1_EGT1":  (300.0, 870.0, "°C"),
    "E1_EGT2":  (300.0, 870.0, "°C"),
    "E1_EGT3":  (300.0, 870.0, "°C"),
    "E1_EGT4":  (300.0, 870.0, "°C"),
}

# ─── Simulation Defaults ────────────────────────────────────────────────────────
DEFAULT_SAMPLE_RATE_HZ = 1   # 1 reading per second
DEFAULT_FLIGHT_DURATION_S = 3600  # 60 minutes

# ─── Flight Profiles ────────────────────────────────────────────────────────────
# Each profile defines throttle % over normalized flight time [0..1]
# Format: list of (time_fraction, throttle_pct)
FLIGHT_PROFILES: dict[str, list[tuple[float, float]]] = {
    "patrol": [
        (0.0, 0.55), (0.05, 0.65), (0.10, 0.55),
        (0.90, 0.55), (0.95, 0.45), (1.0, 0.30),
    ],
    "climb": [
        (0.0, 0.60), (0.05, 0.90), (0.20, 0.95),
        (0.50, 0.80), (0.80, 0.70), (0.95, 0.50), (1.0, 0.30),
    ],
    "cruise": [
        (0.0, 0.55), (0.05, 0.70), (0.15, 0.65),
        (0.85, 0.65), (0.95, 0.50), (1.0, 0.30),
    ],
    "high_altitude": [
        (0.0, 0.65), (0.08, 0.85), (0.25, 0.75),
        (0.85, 0.75), (0.95, 0.50), (1.0, 0.30),
    ],
    "desert_heat": [
        (0.0, 0.55), (0.05, 0.68), (0.15, 0.62),
        (0.85, 0.62), (0.95, 0.48), (1.0, 0.30),
    ],
    "arctic_cold": [
        (0.0, 0.45), (0.10, 0.60), (0.25, 0.55),
        (0.85, 0.55), (0.95, 0.45), (1.0, 0.30),
    ],
    "combat_burst": [
        (0.0, 0.70), (0.05, 1.00), (0.35, 1.00),
        (0.70, 0.85), (0.90, 0.60), (1.0, 0.35),
    ],
}

# ─── Fault Library ──────────────────────────────────────────────────────────────
FAULT_TYPES: list[str] = [
    "oil_cooler_degradation",
    "cylinder_head_overheat",
    "exhaust_valve_leak",
    "alternator_rectifier_drift",
    "fuel_flow_oscillation",
]

# Map fault type → which sensor channels it primarily affects
FAULT_AFFECTED_CHANNELS: dict[str, list[str]] = {
    "oil_cooler_degradation":     ["E1_OilT", "E1_OilP"],
    "cylinder_head_overheat":     ["E1_CHT1", "E1_CHT2", "E1_CHT3", "E1_CHT4"],
    "exhaust_valve_leak":         ["E1_EGT1", "E1_EGT2", "E1_EGT3", "E1_EGT4"],
    "alternator_rectifier_drift": ["amp1", "amp2", "volt1", "volt2"],
    "fuel_flow_oscillation":      ["E1_FFlow"],
}
