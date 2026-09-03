"""
SIH26054 — Automated Anti-Leakage & OOD Verification Test
Ensures:
  1. Models are verified on distinct held-out flight IDs (Leave-Flight-Out).
  2. Model maintains an Out-of-Distribution (OOD) F1 >= 0.75 even under
     2.5x sensor noise and unseen flight profiles.
"""

from __future__ import annotations

import pytest
from backend.models.validate_ood import run_ood_validation


def test_out_of_distribution_generalization():
    """Verify that OOD generalization aligns with published literature (F1 >= 0.75)."""
    results = run_ood_validation()

    # In-Distribution clean recall
    assert results["id_recall"] >= 0.90, "In-distribution recall on unseen flights fell below 90%"

    # Out-of-Distribution stress test (unseen profile + 2.5x sensor noise)
    assert results["ood_f1"] >= 0.75, (
        f"OOD F1 score ({results['ood_f1']:.3f}) fell below literature threshold (0.75)"
    )
