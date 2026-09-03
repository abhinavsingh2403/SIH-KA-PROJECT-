"""
SIH26054 — Stage 2: Ground Fault Classifier
Multi-class classifier for fine-grained fault identification.
Only triggered when Stage 1 flags an anomaly.

Architecture: Random Forest with feature importance for explainability.
Outputs: fault_type, confidence, key_sensors (top contributing channels).
Unknown-fault handling: if max confidence < UNKNOWN_FAULT_CONFIDENCE_THRESHOLD (0.60),
returns "unknown_pattern" instead of forcing a guess.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from backend.config import UNKNOWN_FAULT_CONFIDENCE_THRESHOLD, SENSOR_CHANNELS
from backend.models.features import FEATURE_NAMES


MODEL_DIR = Path(__file__).parent.parent.parent / "data" / "models"


class Stage2Classifier:
    """Multi-class fault classifier for ground station deployment."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.model: RandomForestClassifier | None = None
        self._is_trained = False
        self._classes: list[str] = []

    def train(self, csv_path: str | Path) -> dict:
        """Train on labeled Stage 2 CSV (columns: 90 features + label [fault_type string])."""
        csv_path = Path(csv_path)

        # Load CSV
        features_list = []
        labels_list = []
        with open(csv_path) as f:
            reader = csv.reader(f)
            next(reader)  # skip header
            for row in reader:
                features_list.append([float(v) for v in row[:-1]])
                labels_list.append(row[-1])

        X = np.array(features_list)
        y_raw = np.array(labels_list)

        # Encode labels
        y = self.label_encoder.fit_transform(y_raw)
        self._classes = list(self.label_encoder.classes_)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Normalize
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train Random Forest
        self.model = RandomForestClassifier(
            n_estimators=150,
            max_depth=15,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)

        target_names = [self._classes[i] for i in sorted(np.unique(np.concatenate([y_test, y_pred])))]
        report = classification_report(
            y_test, y_pred,
            target_names=target_names,
            zero_division=0,
        )

        metrics = {
            "accuracy": float(accuracy),
            "num_classes": len(self._classes),
            "classes": self._classes,
            "test_size": len(y_test),
            "train_size": len(y_train),
            "report": report,
        }

        self._is_trained = True
        return metrics

    def predict(self, features: np.ndarray) -> dict:
        """
        Predict fault type from a 90-dim feature vector.
        Returns dict with fault_type, confidence, key_sensors.
        """
        if not self._is_trained or self.model is None:
            raise RuntimeError("Stage 2 model not trained. Call train() first.")

        features_scaled = self.scaler.transform(features.reshape(1, -1))
        probs = self.model.predict_proba(features_scaled)[0]
        max_idx = int(np.argmax(probs))
        max_conf = float(probs[max_idx])

        # Unknown-fault handling
        if max_conf < UNKNOWN_FAULT_CONFIDENCE_THRESHOLD:
            fault_type = "unknown_pattern"
        else:
            fault_type = self._classes[max_idx]

        # Explainability: which sensor channels contributed most
        key_sensors = self._get_key_sensors(top_n=3)

        return {
            "fault_type": fault_type,
            "confidence": max_conf,
            "key_sensors": key_sensors,
            "all_probabilities": {
                self._classes[i]: float(probs[i]) for i in range(len(self._classes))
            },
        }

    def _get_key_sensors(self, top_n: int = 3) -> list[str]:
        """Get the top contributing sensor channels from feature importance."""
        if self.model is None:
            return []

        importances = self.model.feature_importances_
        # Group importances by sensor channel (6 features per channel)
        channel_importance: dict[str, float] = {}
        for i, feat_name in enumerate(FEATURE_NAMES):
            ch = feat_name.rsplit("_", 1)[0]  # e.g. "E1_CHT1_mean" → "E1_CHT1"
            # Handle multi-underscore names correctly
            for sensor in SENSOR_CHANNELS:
                if feat_name.startswith(sensor + "_"):
                    ch = sensor
                    break
            channel_importance[ch] = channel_importance.get(ch, 0.0) + importances[i]

        sorted_channels = sorted(channel_importance.items(), key=lambda x: x[1], reverse=True)
        return [ch for ch, _ in sorted_channels[:top_n]]

    def save(self, path: str | Path | None = None):
        """Persist model to disk."""
        if path is None:
            path = MODEL_DIR / "stage2"
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path / "model.joblib")
        joblib.dump(self.scaler, path / "scaler.joblib")
        joblib.dump(self.label_encoder, path / "label_encoder.joblib")
        with open(path / "config.json", "w") as f:
            json.dump({"classes": self._classes}, f)
        print(f"Stage 2 model saved to {path}")

    def load(self, path: str | Path | None = None):
        """Load model from disk."""
        if path is None:
            path = MODEL_DIR / "stage2"
        path = Path(path)
        self.model = joblib.load(path / "model.joblib")
        self.scaler = joblib.load(path / "scaler.joblib")
        self.label_encoder = joblib.load(path / "label_encoder.joblib")
        with open(path / "config.json") as f:
            cfg = json.load(f)
        self._classes = cfg["classes"]
        self._is_trained = True
        print(f"Stage 2 model loaded from {path}")
