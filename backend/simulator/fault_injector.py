"""
SIH26054 — FMEA Fault Injector
Applies gradual, physically-motivated degradation curves onto clean flight
telemetry to simulate realistic engine faults.

Each fault type has:
  - An onset time (fraction of flight)
  - A severity multiplier (0.1 = subtle, 1.0 = extreme)
  - A gradual ramp function (no step-jumps — matches real research findings)
  - Per-cylinder targeting where applicable

The degradation follows a sigmoid ramp:
  ramp(t) = severity * sigmoid((t - onset) / spread)
This gives a smooth S-curve transition from healthy to degraded.
"""

from __future__ import annotations

import math
import uuid
from copy import deepcopy

import numpy as np

from backend.config import FAULT_AFFECTED_CHANNELS
from backend.simulator.engine_simulator import FlightData


def _sigmoid_ramp(
    timestamps: np.ndarray,
    onset_s: float,
    duration_s: float,
    severity: float,
) -> np.ndarray:
    """
    Generate a smooth sigmoid degradation ramp.
    Returns values in [0, severity] — 0 before onset, ramps to severity after.
    """
    spread = max(duration_s * 0.15, 30.0)  # transition zone width
    x = (timestamps - onset_s) / spread
    return severity / (1.0 + np.exp(-x))


def inject_fault(
    flight_data: FlightData,
    fault_type: str,
    onset_time_pct: float = 0.3,
    severity: float = 0.5,
    target_cylinder: int | None = None,
    seed: int | None = None,
) -> tuple[FlightData, dict]:
    """
    Inject a fault into a copy of the flight data. Returns (modified_data, fault_metadata).

    Does NOT mutate the original FlightData — always works on a deep copy.
    """
    rng = np.random.default_rng(seed)
    data = deepcopy(flight_data)

    onset_s = onset_time_pct * data.duration_s
    remaining_s = data.duration_s - onset_s

    ramp = _sigmoid_ramp(data.timestamps, onset_s, remaining_s, severity)

    fault_id = f"fault_{uuid.uuid4().hex[:10]}"
    affected_channels: list[str] = []

    if fault_type == "oil_cooler_degradation":
        # OilT rises gradually (+35°C at full severity), OilP drops (-25 psi)
        data.channels["E1_OilT"] += ramp * 35.0
        data.channels["E1_OilP"] -= ramp * 25.0
        # Add turbulent noise as cooler degrades
        noise_scale = ramp * 2.0
        data.channels["E1_OilT"] += rng.normal(0, 1, len(ramp)) * noise_scale
        data.channels["E1_OilP"] += rng.normal(0, 1, len(ramp)) * noise_scale
        affected_channels = ["E1_OilT", "E1_OilP"]

    elif fault_type == "cylinder_head_overheat":
        # Single cylinder thermal runaway: CHT rises +50°C, EGT rises +40°C
        cyl = target_cylinder if target_cylinder in (1, 2, 3, 4) else rng.integers(1, 5)
        cht_ch = f"E1_CHT{cyl}"
        egt_ch = f"E1_EGT{cyl}"
        data.channels[cht_ch] += ramp * 50.0
        data.channels[egt_ch] += ramp * 40.0
        # Cross-contamination: adjacent cylinder gets mild heat (+8°C)
        adj_cyl = (cyl % 4) + 1
        data.channels[f"E1_CHT{adj_cyl}"] += ramp * 8.0
        affected_channels = [cht_ch, egt_ch, f"E1_CHT{adj_cyl}"]

    elif fault_type == "exhaust_valve_leak":
        # Leaking exhaust valve: EGT drops on one cylinder (combustion gases bypass),
        # with increasing oscillation as the valve seat degrades
        cyl = target_cylinder if target_cylinder in (1, 2, 3, 4) else rng.integers(1, 5)
        egt_ch = f"E1_EGT{cyl}"
        data.channels[egt_ch] -= ramp * 60.0
        # Oscillation increases with degradation
        osc_freq = 0.05  # Hz
        oscillation = ramp * 25.0 * np.sin(2 * math.pi * osc_freq * data.timestamps)
        data.channels[egt_ch] += oscillation
        affected_channels = [egt_ch]

    elif fault_type == "alternator_rectifier_drift":
        # Rectifier diode degradation: voltage sag + current imbalance between buses
        data.channels["volt1"] -= ramp * 3.5
        data.channels["volt2"] -= ramp * 1.5  # asymmetric degradation
        data.channels["amp1"] += ramp * 15.0   # current compensation attempt
        data.channels["amp2"] -= ramp * 8.0    # load shedding on bus 2
        # High-frequency ripple as rectifier fails
        ripple = ramp * 0.8 * np.sin(2 * math.pi * 0.3 * data.timestamps)
        data.channels["volt1"] += ripple
        affected_channels = ["volt1", "volt2", "amp1", "amp2"]

    elif fault_type == "fuel_flow_oscillation":
        # Fuel metering unit sticking: FF hunting ±25% around nominal
        base_ff = data.channels["E1_FFlow"].copy()
        osc_amplitude = ramp * 0.25 * base_ff
        osc_freq = 0.02 + ramp * 0.08  # frequency increases with severity
        oscillation = osc_amplitude * np.sin(
            2 * math.pi * np.cumsum(osc_freq / data.sample_rate_hz)
        )
        data.channels["E1_FFlow"] += oscillation
        # Fuel oscillation causes mild EGT hunting on all cylinders
        for cyl in range(1, 5):
            data.channels[f"E1_EGT{cyl}"] += oscillation * 3.0
        affected_channels = ["E1_FFlow", "E1_EGT1", "E1_EGT2", "E1_EGT3", "E1_EGT4"]

    else:
        raise ValueError(f"Unknown fault type: {fault_type}")

    metadata = {
        "fault_id": fault_id,
        "flight_id": data.flight_id,
        "fault_type": fault_type,
        "onset_time_pct": onset_time_pct,
        "onset_time_s": onset_s,
        "severity": severity,
        "affected_channels": affected_channels,
        "target_cylinder": target_cylinder,
    }

    return data, metadata
