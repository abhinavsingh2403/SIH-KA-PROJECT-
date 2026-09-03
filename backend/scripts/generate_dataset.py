"""
SIH26054 — Training Dataset Generator
Generates labeled windowed feature datasets for Stage 1 (binary) and Stage 2 (multi-class).

Output:
  data/training_stage1.csv  — columns: 90 features + label (0=normal, 1=anomalous)
  data/training_stage2.csv  — columns: 90 features + label (fault type string)
"""

from __future__ import annotations

import csv
import sys
import time
from pathlib import Path

import numpy as np

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.config import FAULT_TYPES, SENSOR_CHANNELS, STAGE1_WINDOW_SECONDS
from backend.models.features import FEATURE_NAMES, extract_window_features
from backend.simulator.engine_simulator import generate_flight
from backend.simulator.fault_injector import inject_fault


def generate_dataset(
    flights_per_class: int = 30,
    severities: list[float] | None = None,
    profiles: list[str] | None = None,
    window_seconds: int = STAGE1_WINDOW_SECONDS,
    stride_seconds: int = 30,
    output_dir: str = "data",
):
    """Generate training CSVs for Stage 1 and Stage 2."""
    if severities is None:
        severities = [0.3, 0.6, 0.9]
    if profiles is None:
        profiles = ["patrol", "climb", "cruise"]

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    stage1_path = output_path / "training_stage1.csv"
    stage2_path = output_path / "training_stage2.csv"

    header = FEATURE_NAMES + ["label"]

    s1_file = open(stage1_path, "w", newline="")
    s2_file = open(stage2_path, "w", newline="")
    s1_writer = csv.writer(s1_file)
    s2_writer = csv.writer(s2_file)
    s1_writer.writerow(header)
    s2_writer.writerow(header)

    total_windows = 0
    flight_count = 0
    t0 = time.time()

    for p_idx, profile in enumerate(profiles):
        # --- Normal flights ---
        for i in range(flights_per_class):
            flight = generate_flight(
                profile=profile, duration_s=600, seed=p_idx * 1000 + i + 1
            )
            windows = _extract_all_windows(flight.channels, flight.num_samples, window_seconds, stride_seconds)
            for feat in windows:
                row = [f"{v:.6f}" for v in feat] + ["normal"]
                s1_writer.writerow([f"{v:.6f}" for v in feat] + ["0"])
                s2_writer.writerow(row)
                total_windows += 1
            flight_count += 1

        # --- Faulted flights ---
        for f_idx, fault_type in enumerate(FAULT_TYPES):
            for s_idx, severity in enumerate(severities):
                for i in range(flights_per_class // len(severities) + 1):
                    if i >= flights_per_class // len(severities):
                        break
                    seed_val = p_idx * 10000 + f_idx * 1000 + s_idx * 100 + i + 100
                    base = generate_flight(
                        profile=profile, duration_s=600,
                        seed=seed_val
                    )
                    onset = 0.2 + np.random.default_rng(i + 1).random() * 0.3  # 20-50% onset
                    faulted, _meta = inject_fault(
                        base, fault_type=fault_type,
                        onset_time_pct=onset, severity=severity, seed=i + 1,
                    )
                    windows = _extract_all_windows(
                        faulted.channels, faulted.num_samples,
                        window_seconds, stride_seconds,
                    )
                    for feat in windows:
                        row_s1 = [f"{v:.6f}" for v in feat] + ["1"]
                        row_s2 = [f"{v:.6f}" for v in feat] + [fault_type]
                        s1_writer.writerow(row_s1)
                        s2_writer.writerow(row_s2)
                        total_windows += 1
                    flight_count += 1

    s1_file.close()
    s2_file.close()

    elapsed = time.time() - t0
    print(f"Generated {flight_count} flights -> {total_windows} windowed samples in {elapsed:.1f}s")
    print(f"  Stage 1 (binary):     {stage1_path}")
    print(f"  Stage 2 (multi-class): {stage2_path}")
    return stage1_path, stage2_path


def _extract_all_windows(
    channels: dict[str, np.ndarray],
    n_samples: int,
    window_size: int,
    stride: int,
) -> list[np.ndarray]:
    """Extract all rolling windows from a flight."""
    windows = []
    for start in range(0, n_samples - window_size, stride):
        feat = extract_window_features(channels, start, start + window_size)
        windows.append(feat)
    return windows


if __name__ == "__main__":
    generate_dataset()
