"""
SIH26054 — Semi-Empirical Aero Piston Engine Simulator
Generates realistic 15-channel time-series telemetry for a 4-cylinder
horizontally-opposed piston engine (Lycoming IO-360 class) on a MALE UAV.

Physics model:
- Throttle profile drives RPM via linear interpolation.
- RPM drives CHT, EGT, OilT, OilP, FFlow, and electrical bus via coupled
  semi-empirical transfer functions calibrated against published Lycoming data.
- Per-cylinder thermal variance simulates manufacturing tolerance and airflow
  asymmetry (cylinders 1 & 3 run hotter on a horizontally-opposed engine).
- Gaussian sensor noise is added at physically realistic magnitudes.
"""

from __future__ import annotations

import csv
import math
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from backend.config import (
    DEFAULT_FLIGHT_DURATION_S,
    DEFAULT_SAMPLE_RATE_HZ,
    FLIGHT_PROFILES,
    SENSOR_CHANNELS,
)


@dataclass
class FlightData:
    """Container for a generated flight's telemetry."""
    flight_id: str
    engine_id: str
    profile: str
    duration_s: int
    sample_rate_hz: int
    timestamps: np.ndarray            # shape (N,)
    channels: dict[str, np.ndarray]   # channel_name → shape (N,)

    @property
    def num_samples(self) -> int:
        return len(self.timestamps)

    @property
    def num_channels(self) -> int:
        return len(self.channels)

    def to_csv(self, output_dir: str | Path) -> Path:
        """Write flight data to CSV. Returns the file path."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        filepath = output_dir / f"{self.flight_id}.csv"

        with open(filepath, "w", newline="") as f:
            writer = csv.writer(f)
            header = ["timestamp"] + SENSOR_CHANNELS
            writer.writerow(header)
            for i in range(self.num_samples):
                row = [f"{self.timestamps[i]:.1f}"]
                for ch in SENSOR_CHANNELS:
                    row.append(f"{self.channels[ch][i]:.4f}")
                writer.writerow(row)

        return filepath


def _interpolate_throttle(profile_name: str, t_frac: float) -> float:
    """Interpolate throttle percentage from flight profile at time fraction t_frac ∈ [0,1]."""
    points = FLIGHT_PROFILES.get(profile_name, FLIGHT_PROFILES["patrol"])
    # Clamp
    t_frac = max(0.0, min(1.0, t_frac))
    # Find bounding points
    for i in range(len(points) - 1):
        t0, v0 = points[i]
        t1, v1 = points[i + 1]
        if t0 <= t_frac <= t1:
            alpha = (t_frac - t0) / (t1 - t0) if t1 > t0 else 0.0
            return v0 + alpha * (v1 - v0)
    return points[-1][1]


def generate_flight(
    engine_id: str = "engine_001",
    profile: str = "patrol",
    duration_s: int = DEFAULT_FLIGHT_DURATION_S,
    sample_rate_hz: int = DEFAULT_SAMPLE_RATE_HZ,
    seed: int | None = None,
) -> FlightData:
    """
    Generate a full flight's telemetry for all 15 sensor channels.

    The physics model couples throttle → RPM → thermal/electrical outputs:
      RPM        = 1800 + throttle * 900  (range ~1800–2700)
      CHT_base   = 90 + RPM/2700 * 150   (range ~90–240 °C)
      EGT_base   = 250 + RPM/2700 * 600  (range ~250–850 °C)
      OilT       = 60 + RPM/2700 * 55    (range ~60–115 °C, with thermal soak)
      OilP       = 80 - RPM/2700 * 35    (range ~45–80 psi, inverse RPM)
      FFlow      = 6 + throttle * 12     (range ~6–18 gal/hr)
      Voltage    = 28.0 ± f(load)
      Amperage   = 25 + throttle * 30    (range ~25–55 A)
    """
    rng = np.random.default_rng(seed)
    flight_id = f"flight_{uuid.uuid4().hex[:12]}"

    n_samples = duration_s * sample_rate_hz
    timestamps = np.linspace(0, duration_s, n_samples, endpoint=False)

    channels: dict[str, np.ndarray] = {}

    # --- Compute throttle and RPM for each timestep ---
    throttle = np.array([
        _interpolate_throttle(profile, t / duration_s) for t in timestamps
    ])
    rpm = 1800.0 + throttle * 900.0

    # --- Cylinder Head Temperatures (CHT1–4) ---
    # Per-cylinder offsets simulate manufacturing variance and cooling asymmetry
    # Cylinders 1 & 3 (front) run ~5–10°C hotter than 2 & 4 (rear)
    cylinder_offsets = [7.0, -3.0, 8.0, -5.0]
    cht_base = 90.0 + (rpm / 2700.0) * 150.0

    # Thermal inertia: CHT responds slowly (τ ≈ 30s)
    tau_cht = 30.0
    dt = 1.0 / sample_rate_hz

    for cyl_idx in range(4):
        ch_name = f"E1_CHT{cyl_idx + 1}"
        target = cht_base + cylinder_offsets[cyl_idx]
        values = np.zeros(n_samples)
        values[0] = target[0]
        for i in range(1, n_samples):
            # First-order lag filter for thermal inertia
            alpha = dt / (tau_cht + dt)
            values[i] = values[i - 1] + alpha * (target[i] - values[i - 1])
        # Sensor noise: ±1.5°C
        values += rng.normal(0, 1.5, n_samples)
        channels[ch_name] = values

    # --- Exhaust Gas Temperatures (EGT1–4) ---
    # EGT responds faster than CHT (τ ≈ 5s)
    tau_egt = 5.0
    egt_base = 250.0 + (rpm / 2700.0) * 600.0
    egt_offsets = [12.0, -8.0, 15.0, -10.0]

    for cyl_idx in range(4):
        ch_name = f"E1_EGT{cyl_idx + 1}"
        target = egt_base + egt_offsets[cyl_idx]
        values = np.zeros(n_samples)
        values[0] = target[0]
        for i in range(1, n_samples):
            alpha = dt / (tau_egt + dt)
            values[i] = values[i - 1] + alpha * (target[i] - values[i - 1])
        # Sensor noise: ±5°C
        values += rng.normal(0, 5.0, n_samples)
        channels[ch_name] = values

    # --- Oil Temperature ---
    # Slow thermal soak (τ ≈ 120s), rises with RPM
    tau_oil_t = 120.0
    oil_t_target = 60.0 + (rpm / 2700.0) * 55.0
    oil_t = np.zeros(n_samples)
    oil_t[0] = 65.0  # cold start
    for i in range(1, n_samples):
        alpha = dt / (tau_oil_t + dt)
        oil_t[i] = oil_t[i - 1] + alpha * (oil_t_target[i] - oil_t[i - 1])
    oil_t += rng.normal(0, 0.8, n_samples)
    channels["E1_OilT"] = oil_t

    # --- Oil Pressure ---
    # Inversely related to temperature (viscosity drop), also RPM-coupled
    oil_p_base = 80.0 - (rpm / 2700.0) * 35.0
    # Temperature correction: higher oil temp → lower pressure
    temp_correction = -0.15 * (oil_t - 80.0)
    oil_p = oil_p_base + temp_correction
    oil_p += rng.normal(0, 1.0, n_samples)
    oil_p = np.clip(oil_p, 20.0, 100.0)
    channels["E1_OilP"] = oil_p

    # --- Fuel Flow ---
    fflow = 6.0 + throttle * 12.0
    fflow += rng.normal(0, 0.3, n_samples)
    fflow = np.clip(fflow, 2.0, 25.0)
    channels["E1_FFlow"] = fflow

    # --- Electrical: Voltages ---
    # 28V bus, slight sag under high load
    load_factor = throttle  # proxy for electrical load
    channels["volt1"] = 28.5 - load_factor * 1.0 + rng.normal(0, 0.15, n_samples)
    channels["volt2"] = 28.3 - load_factor * 0.8 + rng.normal(0, 0.15, n_samples)

    # --- Electrical: Amperages ---
    channels["amp1"] = 25.0 + throttle * 30.0 + rng.normal(0, 1.5, n_samples)
    channels["amp2"] = 24.0 + throttle * 28.0 + rng.normal(0, 1.5, n_samples)

    return FlightData(
        flight_id=flight_id,
        engine_id=engine_id,
        profile=profile,
        duration_s=duration_s,
        sample_rate_hz=sample_rate_hz,
        timestamps=timestamps,
        channels=channels,
    )
