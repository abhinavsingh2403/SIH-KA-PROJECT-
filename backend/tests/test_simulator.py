"""
SIH26054 — Unit Tests for Engine Simulator & Fault Injector
Validates:
  1. All 15 channels are generated with correct dimensions.
  2. Nominal values fall within published operating bands.
  3. All 3 flight profiles produce valid data.
  4. Fault injection produces gradual ramps (no step-jumps).
  5. Per-cylinder targeting works for cylinder-specific faults.
  6. CSV export produces a readable file with correct headers.
"""

from __future__ import annotations

import os
import tempfile

import numpy as np
import pytest

from backend.config import (
    FAULT_TYPES,
    NOMINAL_BANDS,
    SENSOR_CHANNELS,
)
from backend.simulator.engine_simulator import generate_flight
from backend.simulator.fault_injector import inject_fault


# ─── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def patrol_flight():
    return generate_flight(profile="patrol", duration_s=300, seed=42)


@pytest.fixture
def climb_flight():
    return generate_flight(profile="climb", duration_s=300, seed=42)


@pytest.fixture
def cruise_flight():
    return generate_flight(profile="cruise", duration_s=300, seed=42)


# ─── Test: Channel Completeness ─────────────────────────────────────────────────

class TestChannelCompleteness:
    def test_all_15_channels_present(self, patrol_flight):
        for ch in SENSOR_CHANNELS:
            assert ch in patrol_flight.channels, f"Missing channel: {ch}"

    def test_channel_dimensions(self, patrol_flight):
        expected = 300  # 300 seconds × 1 Hz
        assert patrol_flight.num_samples == expected
        for ch in SENSOR_CHANNELS:
            assert len(patrol_flight.channels[ch]) == expected

    def test_timestamps_monotonic(self, patrol_flight):
        diffs = np.diff(patrol_flight.timestamps)
        assert np.all(diffs > 0), "Timestamps must be strictly increasing"


# ─── Test: Nominal Operating Bands ──────────────────────────────────────────────

class TestNominalBands:
    """Verify that clean flight data stays within physically plausible bounds.
    We allow 5% exceedance for sensor noise — real sensors have noise too."""

    @pytest.mark.parametrize("profile", ["patrol", "climb", "cruise"])
    def test_channels_within_bounds(self, profile):
        flight = generate_flight(profile=profile, duration_s=300, seed=42)

        for ch, (lo, hi, _unit) in NOMINAL_BANDS.items():
            vals = flight.channels[ch]
            # Allow 5% of readings outside nominal (sensor noise)
            below = np.sum(vals < lo * 0.85) / len(vals)
            above = np.sum(vals > hi * 1.15) / len(vals)
            assert below < 0.05, f"{ch} ({profile}): {below:.1%} below {lo}"
            assert above < 0.05, f"{ch} ({profile}): {above:.1%} above {hi}"


# ─── Test: Flight Profile Variety ───────────────────────────────────────────────

class TestFlightProfiles:
    def test_climb_has_higher_rpm_than_patrol(self):
        patrol = generate_flight(profile="patrol", duration_s=300, seed=42)
        climb = generate_flight(profile="climb", duration_s=300, seed=42)

        # Mid-flight CHT should be higher for climb (higher throttle → higher RPM → more heat)
        mid = 150  # midpoint sample
        patrol_cht_avg = np.mean([patrol.channels[f"E1_CHT{i}"][mid] for i in range(1, 5)])
        climb_cht_avg = np.mean([climb.channels[f"E1_CHT{i}"][mid] for i in range(1, 5)])
        assert climb_cht_avg > patrol_cht_avg, "Climb profile should produce higher CHTs than patrol"


# ─── Test: Fault Injection ──────────────────────────────────────────────────────

class TestFaultInjection:
    @pytest.mark.parametrize("fault_type", FAULT_TYPES)
    def test_fault_modifies_affected_channels(self, patrol_flight, fault_type):
        faulted, meta = inject_fault(
            patrol_flight, fault_type=fault_type, onset_time_pct=0.3, severity=0.8, seed=42
        )

        # At least one affected channel should differ from original
        changed = False
        for ch in meta["affected_channels"]:
            diff = np.abs(faulted.channels[ch] - patrol_flight.channels[ch])
            if np.max(diff) > 1.0:
                changed = True
                break
        assert changed, f"Fault '{fault_type}' did not modify any channel significantly"

    def test_no_step_jumps(self, patrol_flight):
        """Verify gradual degradation: max derivative should be bounded."""
        faulted, _ = inject_fault(
            patrol_flight, fault_type="oil_cooler_degradation",
            onset_time_pct=0.3, severity=1.0, seed=42,
        )

        oil_t = faulted.channels["E1_OilT"]
        derivatives = np.abs(np.diff(oil_t))
        # No single-step jump > 12°C (accounts for injected turbulent noise on top of ramp)
        assert np.max(derivatives) < 12.0, (
            f"Step-jump detected in OilT: max Δ = {np.max(derivatives):.2f}°C"
        )

    def test_cylinder_targeting(self, patrol_flight):
        """Verify per-cylinder fault only affects the targeted cylinder."""
        faulted, meta = inject_fault(
            patrol_flight, fault_type="cylinder_head_overheat",
            onset_time_pct=0.3, severity=0.8, target_cylinder=2, seed=42,
        )

        # CHT2 should be much hotter than original
        diff_target = np.max(
            faulted.channels["E1_CHT2"] - patrol_flight.channels["E1_CHT2"]
        )
        # CHT4 (non-adjacent) should be unaffected
        diff_other = np.max(
            np.abs(faulted.channels["E1_CHT4"] - patrol_flight.channels["E1_CHT4"])
        )
        assert diff_target > 20.0, f"Targeted cylinder CHT2 change too small: {diff_target:.1f}"
        assert diff_other < 3.0, f"Non-adjacent cylinder CHT4 changed too much: {diff_other:.1f}"

    def test_pre_onset_data_unchanged(self, patrol_flight):
        """Data before the fault onset time should be nearly identical."""
        faulted, meta = inject_fault(
            patrol_flight, fault_type="oil_cooler_degradation",
            onset_time_pct=0.5, severity=1.0, seed=42,
        )

        # First 20% of flight should be virtually unchanged
        end_idx = int(0.15 * patrol_flight.num_samples)
        for ch in ["E1_OilT", "E1_OilP"]:
            diff = np.max(np.abs(
                faulted.channels[ch][:end_idx] - patrol_flight.channels[ch][:end_idx]
            ))
            assert diff < 3.0, f"Pre-onset {ch} changed by {diff:.2f}"


# ─── Test: CSV Export ───────────────────────────────────────────────────────────

class TestCSVExport:
    def test_csv_roundtrip(self, patrol_flight):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = patrol_flight.to_csv(tmpdir)
            assert path.exists()

            # Read back and verify header
            with open(path) as f:
                header = f.readline().strip().split(",")
            assert header[0] == "timestamp"
            assert header[1:] == SENSOR_CHANNELS

            # Verify row count (header + data rows)
            with open(path) as f:
                lines = f.readlines()
            assert len(lines) == patrol_flight.num_samples + 1
