"""
SIH26054 — Federated Learning Fleet Framing & Model Aggregator
Simulates a multi-UAV squadron (e.g., TAPAS-01 through TAPAS-05) training edge anomaly
detection models on local flight sorties.

Key Defense Characteristics:
  1. Data Privacy: Raw telemetry never leaves the UAV onboard computer.
  2. Weight Delta Aggregation (FedAvg): Ground station aggregates parameter deltas
     w_global = sum(n_k / N * w_k) across all active sorties.
  3. Collective Fleet Intelligence: A rare fault experienced by TAPAS-02 (e.g., oil cooler fouling)
     updates the global model, protecting TAPAS-01, TAPAS-03, TAPAS-04, and TAPAS-05 before
     they encounter the failure mode.
"""

from __future__ import annotations

from typing import Any
import numpy as np
from sklearn.linear_model import SGDClassifier
from sklearn.preprocessing import StandardScaler

from backend.simulator.engine_simulator import generate_flight
from backend.simulator.fault_injector import inject_fault
from backend.models.features import extract_window_features
from backend.config import SENSOR_CHANNELS


class UAVEdgeClient:
    """Represents an edge onboard computer on a single MALE UAV."""

    def __init__(self, uav_id: str, profile: str = "patrol"):
        self.uav_id = uav_id
        self.profile = profile
        self.model = SGDClassifier(loss="log_loss", penalty="l2", alpha=1e-4, random_state=42)
        self.scaler = StandardScaler()
        self.sample_count = 0
        self._is_initialized = False

    def collect_local_sortie_data(self, fault_type: str = "normal", severity: float = 0.8) -> tuple[np.ndarray, np.ndarray]:
        """Simulates flying a local sortie and extracting 90-second feature windows."""
        flight = generate_flight(profile=self.profile, duration_s=600)
        if fault_type != "normal":
            modified, _ = inject_fault(flight, fault_type=fault_type, onset_time_pct=0.35, severity=severity)
            flight = modified

        X_list = []
        y_list = []
        window_size = 90
        step_size = 20

        for start in range(0, flight.num_samples - window_size, step_size):
            end = start + window_size
            mid = (start + end) / 2
            is_fault = (fault_type != "normal") and (mid >= 210)
            feats = extract_window_features(flight.channels, start, end)
            X_list.append(feats)
            y_list.append(1 if is_fault else 0)

        X = np.array(X_list)
        y = np.array(y_list)
        self.sample_count = len(y)
        return X, y

    def train_local_edge_epoch(self, X: np.ndarray, y: np.ndarray) -> dict[str, Any]:
        """Trains locally for one epoch and returns model weights (never raw data)."""
        if not self._is_initialized:
            X_scaled = self.scaler.fit_transform(X)
            # Ensure both classes exist in initial fit
            classes = np.array([0, 1])
            self.model.partial_fit(X_scaled, y, classes=classes)
            self._is_initialized = True
        else:
            X_scaled = self.scaler.transform(X)
            self.model.partial_fit(X_scaled, y)

        return {
            "uav_id": self.uav_id,
            "sample_count": self.sample_count,
            "coef": self.model.coef_.copy(),
            "intercept": self.model.intercept_.copy(),
        }

    def set_weights(self, coef: np.ndarray, intercept: np.ndarray):
        """Updates local onboard model with aggregated global weights."""
        self.model.coef_ = coef.copy()
        self.model.intercept_ = intercept.copy()
        self._is_initialized = True


class FleetFederatedAggregator:
    """
    Ground Station Central Federated Coordinator.
    Implements FedAvg (McMahan et al.) across a squadron of UAVs.
    """

    def __init__(self, squadron_size: int = 5):
        self.clients: list[UAVEdgeClient] = [
            UAVEdgeClient(uav_id=f"TAPAS-{i+1:02d}", profile="patrol" if i % 2 == 0 else "climb")
            for i in range(squadron_size)
        ]
        self.global_coef: np.ndarray | None = None
        self.global_intercept: np.ndarray | None = None
        self.round_history: list[dict[str, Any]] = []

    def execute_federated_round(self, round_num: int = 1) -> dict[str, Any]:
        """
        Executes one full Federated Learning communication round:
          1. Each UAV edge agent trains locally on its sortie.
          2. Edge agents send weight vectors to ground station.
          3. Ground station performs weighted FedAvg aggregation.
          4. Ground station broadcasts updated global model to all UAVs.
        """
        # Distribute different faults across squadron to test collective transfer learning
        fault_assignment = [
            "normal",
            "oil_cooler_degradation",
            "cylinder_head_overheat",
            "alternator_rectifier_drift",
            "fuel_flow_oscillation",
        ]

        local_updates = []
        total_samples = 0

        for idx, client in enumerate(self.clients):
            fault = fault_assignment[idx % len(fault_assignment)]
            X, y = client.collect_local_sortie_data(fault_type=fault)
            update = client.train_local_edge_epoch(X, y)
            local_updates.append(update)
            total_samples += update["sample_count"]

        # FedAvg: Weighted average of coefficients and intercepts
        avg_coef = np.zeros_like(local_updates[0]["coef"])
        avg_intercept = np.zeros_like(local_updates[0]["intercept"])

        for upd in local_updates:
            weight = upd["sample_count"] / total_samples
            avg_coef += weight * upd["coef"]
            avg_intercept += weight * upd["intercept"]

        self.global_coef = avg_coef
        self.global_intercept = avg_intercept

        # Broadcast updated global model weights back to all UAVs
        for client in self.clients:
            client.set_weights(self.global_coef, self.global_intercept)

        round_summary = {
            "round": round_num,
            "participating_uavs": [c.uav_id for c in self.clients],
            "total_samples_aggregated": int(total_samples),
            "global_weight_norm": float(np.linalg.norm(self.global_coef)),
            "weight_dimensions": list(self.global_coef.shape),
            "collective_faults_learned": fault_assignment[: len(self.clients)],
        }
        self.round_history.append(round_summary)
        return round_summary
