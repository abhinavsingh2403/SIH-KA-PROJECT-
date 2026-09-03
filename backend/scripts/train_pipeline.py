"""
SIH26054 — End-to-End Training Pipeline
1. Generate training datasets (or load existing)
2. Train Stage 1 (edge anomaly detector)
3. Train Stage 2 (ground fault classifier)
4. Save models and print metrics
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.scripts.generate_dataset import generate_dataset
from backend.models.stage1_detector import Stage1Detector
from backend.models.stage2_classifier import Stage2Classifier


def main():
    t0 = time.time()

    # ─── Phase 1: Generate or Load Training Data ────────────────────────────
    print("=" * 60)
    print("PHASE 1: Preparing training datasets...")
    print("=" * 60)

    s1_path = Path("data/training_stage1.csv")
    s2_path = Path("data/training_stage2.csv")

    if s1_path.exists() and s2_path.exists() and s1_path.stat().st_size > 100000:
        print(f"Reusing existing dataset: {s1_path} ({s1_path.stat().st_size / 1024:.1f} KB)")
    else:
        s1_path, s2_path = generate_dataset(
            flights_per_class=30,
            severities=[0.3, 0.6, 0.9],
            profiles=["patrol", "climb", "cruise"],
        )

    # ─── Phase 2: Train Stage 1 ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("PHASE 2: Training Stage 1 -- Edge Anomaly Detector...")
    print("=" * 60)

    detector = Stage1Detector()
    s1_metrics = detector.train(s1_path)

    print(f"\nStage 1 Results:")
    print(f"  Threshold: {s1_metrics['threshold']:.2f}")
    print(f"  Recall:    {s1_metrics['recall']:.4f}")
    print(f"  F1 Score:  {s1_metrics['f1']:.4f}")
    print(f"  Train/Test: {s1_metrics['train_size']}/{s1_metrics['test_size']}")
    print(f"\n{s1_metrics['report']}")

    detector.save()

    # ─── Phase 3: Train Stage 2 ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("PHASE 3: Training Stage 2 -- Ground Fault Classifier...")
    print("=" * 60)

    classifier = Stage2Classifier()
    s2_metrics = classifier.train(s2_path)

    print(f"\nStage 2 Results:")
    print(f"  Accuracy:     {s2_metrics['accuracy']:.4f}")
    print(f"  Num Classes:  {s2_metrics['num_classes']}")
    print(f"  Classes:      {s2_metrics['classes']}")
    print(f"  Train/Test:   {s2_metrics['train_size']}/{s2_metrics['test_size']}")
    print(f"\n{s2_metrics['report']}")

    classifier.save()

    # ─── Summary ────────────────────────────────────────────────────────────
    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print(f"PIPELINE COMPLETE in {elapsed:.1f}s")
    print("=" * 60)

    recall_ok = s1_metrics["recall"] >= 0.90
    acc_ok = s2_metrics["accuracy"] >= 0.75

    print(f"  Stage 1 Recall >= 0.90: {'[PASS]' if recall_ok else '[FAIL]'} ({s1_metrics['recall']:.4f})")
    print(f"  Stage 2 Accuracy >= 0.75: {'[PASS]' if acc_ok else '[FAIL]'} ({s2_metrics['accuracy']:.4f})")

    return s1_metrics, s2_metrics


if __name__ == "__main__":
    main()
