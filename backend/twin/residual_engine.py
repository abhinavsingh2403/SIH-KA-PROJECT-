"""
SIH26054 — Digital Twin Residual Engine
The physics-informed half of the twin.
Maintains expected-value curves per engine profile and computes residuals:
  residual[ch][t] = |actual[ch][t] - expected[ch][t]|

Also tracks:
  - Growing trends (slope over a rolling window) to distinguish true degradation from spikes
  - Sensor health checks (flags physically impossible readings as sensor faults)
"""

from __future__ import annotations

import numpy as np
from scipy import stats as sp_stats

from backend.config import NOMINAL_BANDS, SENSOR_CHANNELS
from backend.simulator.engine_simulator import FlightData, _interpolate_throttle


class DigitalTwinResidualEngine:
    """Physics-informed baseline tracking and residual computation."""

    def __init__(self):
        pass

    def compute_expected_curves(self, flight: FlightData) -> dict[str, np.ndarray]:
        """
        Compute the expected physics baseline for all 15 channels
        based on the flight's profile and throttle setting, accounting for
        thermal inertia and thermodynamic coupling.
        """
        timestamps = flight.timestamps
        duration_s = flight.duration_s
        n_samples = len(timestamps)
        dt = 1.0 / flight.sample_rate_hz if flight.sample_rate_hz > 0 else 1.0

        throttle = np.array([
            _interpolate_throttle(flight.profile, t / duration_s) for t in timestamps
        ])
        rpm = 1800.0 + throttle * 900.0

        expected: dict[str, np.ndarray] = {}

        # CHT baselines (with nominal cylinder offsets and thermal inertia tau = 30s)
        cylinder_offsets = [7.0, -3.0, 8.0, -5.0]
        cht_base = 90.0 + (rpm / 2700.0) * 150.0
        tau_cht = 30.0
        alpha_cht = dt / (tau_cht + dt)

        for i in range(4):
            target = cht_base + cylinder_offsets[i]
            vals = np.zeros(n_samples)
            vals[0] = target[0]
            for s in range(1, n_samples):
                vals[s] = vals[s - 1] + alpha_cht * (target[s] - vals[s - 1])
            expected[f"E1_CHT{i+1}"] = vals

        # EGT baselines (thermal inertia tau = 5s)
        egt_base = 250.0 + (rpm / 2700.0) * 600.0
        egt_offsets = [12.0, -8.0, 15.0, -10.0]
        tau_egt = 5.0
        alpha_egt = dt / (tau_egt + dt)

        for i in range(4):
            target = egt_base + egt_offsets[i]
            vals = np.zeros(n_samples)
            vals[0] = target[0]
            for s in range(1, n_samples):
                vals[s] = vals[s - 1] + alpha_egt * (target[s] - vals[s - 1])
            expected[f"E1_EGT{i+1}"] = vals

        # Oil System (thermal soak tau = 120s, cold start at 65°C)
        tau_oil_t = 120.0
        alpha_oil = dt / (tau_oil_t + dt)
        oil_t_target = 60.0 + (rpm / 2700.0) * 55.0
        oil_t = np.zeros(n_samples)
        oil_t[0] = 65.0
        for s in range(1, n_samples):
            oil_t[s] = oil_t[s - 1] + alpha_oil * (oil_t_target[s] - oil_t[s - 1])
        expected["E1_OilT"] = oil_t

        oil_p_base = 80.0 - (rpm / 2700.0) * 35.0
        temp_correction = -0.15 * (oil_t - 80.0)
        oil_p = np.clip(oil_p_base + temp_correction, 20.0, 100.0)
        expected["E1_OilP"] = oil_p

        # Fuel Flow
        expected["E1_FFlow"] = 6.0 + throttle * 12.0

        # Electrical Bus
        expected["volt1"] = 28.5 - throttle * 1.0
        expected["volt2"] = 28.3 - throttle * 0.8
        expected["amp1"] = 25.0 + throttle * 30.0
        expected["amp2"] = 24.0 + throttle * 28.0

        return expected

    def compute_residuals(
        self,
        flight: FlightData,
    ) -> dict[str, dict]:
        """
        Compute residuals |actual - expected| and trend metrics for each channel.
        """
        expected = self.compute_expected_curves(flight)
        results = {}

        for ch in SENSOR_CHANNELS:
            act = flight.channels[ch]
            exp = expected[ch]
            res = np.abs(act - exp)

            # Trend slope over the last 120 samples
            recent_len = min(120, len(res))
            if recent_len > 2:
                x = np.arange(recent_len)
                slope = float(sp_stats.linregress(x, res[-recent_len:]).slope)
            else:
                slope = 0.0

            # Sensor health check: physical plausibility bounds
            lo, hi, _unit = NOMINAL_BANDS[ch]
            is_impossible = np.any(act < (lo * 0.4)) or np.any(act > (hi * 2.0))

            results[ch] = {
                "expected": exp,
                "actual": act,
                "residual": res,
                "mean_residual": float(np.mean(res)),
                "max_residual": float(np.max(res)),
                "trend_slope": slope,
                "is_sensor_fault": bool(is_impossible),
            }

        return results
