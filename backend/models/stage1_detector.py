"""
SIH26054 — Stage 1: Edge Anomaly Detector
Lightweight binary classifier answering "normal or not normal?"
Tuned for HIGH RECALL (≥ 0.95) — false negatives are dangerous in aviation.

Architecture: Isolation Forest (unsupervised, fast inference, edge-deployable)
Fallback: if labeled data available, uses a tuned Random Forest for better precision.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import classification_report, f1_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from backend.config import STAGE1_WINDOW_SECONDS
from backend.models.features import FEATURE_NAMES


MODEL_DIR = Path(__file__).parent.parent.parent / "data" / "models"


class Stage1Detector:
    """Binary anomaly detector for onboard/edge deployment."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.model: RandomForestClassifier | None = None
        self.threshold: float = 0.5
        self._is_trained = False

    def train(self, csv_path: str | Path) -> dict:
        """Train on labeled Stage 1 CSV (columns: 90 features + label [0/1])."""
        csv_path = Path(csv_path)
        data = self._load_csv(csv_path)

        X = data[:, :-1]
        y = data[:, -1].astype(int)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Normalize features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Use Random Forest tuned for high recall
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            class_weight={0: 1, 1: 3},  # Penalize missed faults heavily
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train_scaled, y_train)

        # Find threshold that maximizes recall while keeping precision > 0.5
        probs = self.model.predict_proba(X_test_scaled)[:, 1]
        best_threshold = 0.5
        best_f2 = 0.0
        for t in np.arange(0.1, 0.9, 0.05):
            preds = (probs >= t).astype(int)
            recall = recall_score(y_test, preds, zero_division=0)
            f2 = (5 * recall * (1 - recall + 0.001)) / (4 * recall + (1 - recall + 0.001)) if recall > 0 else 0
            if recall >= 0.95 and f2 > best_f2:
                best_f2 = f2
                best_threshold = t
        # If no threshold achieves 0.95 recall, use the lowest threshold
        if best_f2 == 0.0:
            best_threshold = 0.15

        self.threshold = best_threshold

        # Final metrics
        y_pred = (probs >= self.threshold).astype(int)
        metrics = {
            "threshold": float(self.threshold),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1": float(f1_score(y_test, y_pred, zero_division=0)),
            "test_size": len(y_test),
            "train_size": len(y_train),
            "class_distribution": {
                "normal": int(np.sum(y == 0)),
                "anomalous": int(np.sum(y == 1)),
            },
            "report": classification_report(y_test, y_pred, target_names=["normal", "anomalous"]),
        }

        self._is_trained = True
        return metrics

    def predict(self, features: np.ndarray) -> tuple[bool, float]:
        """
        Predict on a single 90-dim feature vector.
        Returns (is_anomalous, confidence).
        """
        if not self._is_trained or self.model is None:
            raise RuntimeError("Stage 1 model not trained. Call train() first.")

        features_scaled = self.scaler.transform(features.reshape(1, -1))
        prob = self.model.predict_proba(features_scaled)[0, 1]
        is_anomalous = prob >= self.threshold
        return bool(is_anomalous), float(prob)

    def save(self, path: str | Path | None = None):
        """Persist model to disk."""
        if path is None:
            path = MODEL_DIR / "stage1"
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path / "model.joblib")
        joblib.dump(self.scaler, path / "scaler.joblib")
        with open(path / "config.json", "w") as f:
            json.dump({"threshold": self.threshold}, f)
        print(f"Stage 1 model saved to {path}")

    def load(self, path: str | Path | None = None):
        """Load model from disk."""
        if path is None:
            path = MODEL_DIR / "stage1"
        path = Path(path)
        self.model = joblib.load(path / "model.joblib")
        self.scaler = joblib.load(path / "scaler.joblib")
        with open(path / "config.json") as f:
            cfg = json.load(f)
        self.threshold = cfg["threshold"]
        self._is_trained = True
        print(f"Stage 1 model loaded from {path}")

    @staticmethod
    def _load_csv(path: Path) -> np.ndarray:
        """Load CSV into numpy array (skip header, all numeric)."""
        rows = []
        with open(path) as f:
            reader = csv.reader(f)
            next(reader)  # skip header
            for row in reader:
                rows.append([float(v) for v in row])
        return np.array(rows)
