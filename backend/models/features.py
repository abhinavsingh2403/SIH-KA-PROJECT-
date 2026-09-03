"""
SIH26054 — Feature Extraction Utilities
Extracts statistical features from rolling sensor windows for ML model input.

Per-window features (15 channels × 6 features = 90-dimensional vector):
  - mean, std, min, max, slope (linear regression), spectral_entropy
"""

from __future__ import annotations

import numpy as np
from scipy import stats as sp_stats

from backend.config import SENSOR_CHANNELS


def _spectral_entropy(signal: np.ndarray) -> float:
    """Compute normalized spectral entropy of a 1D signal."""
    if len(signal) < 4:
        return 0.0
    fft_mag = np.abs(np.fft.rfft(signal - np.mean(signal)))
    power = fft_mag ** 2
    total = power.sum()
    if total < 1e-12:
        return 0.0
    psd = power / total
    psd = psd[psd > 0]
    entropy = -np.sum(psd * np.log2(psd))
    max_entropy = np.log2(len(psd)) if len(psd) > 1 else 1.0
    return float(entropy / max_entropy) if max_entropy > 0 else 0.0


def _slope(signal: np.ndarray) -> float:
    """Linear regression slope over the window."""
    if len(signal) < 2:
        return 0.0
    x = np.arange(len(signal), dtype=np.float64)
    result = sp_stats.linregress(x, signal)
    return float(result.slope)


def extract_window_features(
    channels: dict[str, np.ndarray],
    start_idx: int,
    end_idx: int,
) -> np.ndarray:
    """
    Extract 90-dimensional feature vector from a window [start_idx:end_idx].
    Returns shape (90,) — 6 features per each of the 15 channels.
    """
    features = []
    for ch in SENSOR_CHANNELS:
        window = channels[ch][start_idx:end_idx]
        if len(window) == 0:
            features.extend([0.0] * 6)
            continue
        features.append(float(np.mean(window)))
        features.append(float(np.std(window)))
        features.append(float(np.min(window)))
        features.append(float(np.max(window)))
        features.append(_slope(window))
        features.append(_spectral_entropy(window))

    return np.array(features, dtype=np.float64)


FEATURE_NAMES: list[str] = []
for _ch in SENSOR_CHANNELS:
    for _stat in ["mean", "std", "min", "max", "slope", "spectral_entropy"]:
        FEATURE_NAMES.append(f"{_ch}_{_stat}")
