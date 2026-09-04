# SIH26054 — AI-Enabled Real-Time Digital Twin for Aero Piston Engine Health Monitoring (MALE UAV)

> **Organization:** DRDO (Defense Research and Development Organisation)
> **Problem Statement ID:** SIH26054 | **Category:** Software | **Theme:** Robotics and Drones
> **Target UAV Class:** TAPAS-BH-201 / Archer-NG class MALE UAV
> **Engine Model Used:** A pure-Python semi-empirical simulator (`backend/simulator/engine_simulator.py`) —
> throttle profile drives RPM via interpolation, and RPM drives CHT/EGT/OilT/OilP/FFlow/electrical readings
> through hand-calibrated transfer functions referenced against published Lycoming IO-360-class data, with
> per-cylinder variance and sensor noise layered on top. This is a physics-informed approximation, not a
> full flight-dynamics simulation (e.g. JSBSim) and not an accurate model of any specific UAV's actual
> engine — real MALE UAVs of this class (e.g. Archer-NG) use purpose-built engines in the 180–220 hp range.
> This is a deliberate, disclosed simplification.
> **Repository:** [abhinavsingh2403/SIH-KA-PROJECT-](https://github.com/abhinavsingh2403/SIH-KA-PROJECT-)
> **Latest Stable Release:** `main` branch — Complete End-to-End System

---

## Executive Summary

The **SIH26054 Digital Twin** is an auditable, physics-informed software suite engineered to monitor,
predict, and diagnose health degradation in Medium-Altitude Long-Endurance (MALE) UAV-class piston engines,
using an open-source general-aviation piston engine model as a physics analog (see engine-model note above).

Unlike generic IoT dashboards or conversational AI demos, this system enforces **safety-critical aerospace
sequencing**:
1. High-frequency 15-channel semi-empirical thermodynamics.
2. Fast edge anomaly detection ($< 90\text{s}$ rolling window, $Z > 3.0$).
3. Multi-class fault isolation via the Stage 2 classifier.
4. Continuous physical residual tracking ($\Delta = |y_{\text{measured}} - y_{\text{model}}|$).
5. Forward What-If mission survivability forecasting.
6. Interactive 3D spatial twin (procedurally-modeled, not an imported CAD asset) with X-ray cutaway
   mechanics and thermal heatmap visualization.
7. Supabase cloud database persistence with resilient local sync.
8. Sortie debrief report generation for post-flight review.

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │         MALE UAV-CLASS GROUND STATION (SIMULATED)        │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │
                       ┌───────────────────────────────────────┴───────────────────────────────────────┐
                       ▼                                                                               ▼
         ┌───────────────────────────┐                                                   ┌───────────────────────────┐
         │  DIGITAL TWIN RESIDUALS   │                                                   │   3D SPATIAL TWIN BENCH   │
         ├───────────────────────────┤                                                   ├───────────────────────────┤
         │ • 15 Coupled Channels     │                                                   │ • Procedural 3D Model     │
         │ • 7 Environmental Regimes │                                                   │ • Thermal Heatmap Map     │
         │ • Δ = |y_meas - y_model|  │                                                   │ • X-Ray Cutaway Mechanics │
         │ • Stage 1: Rolling Edge Z │                                                   │ • 4 Quick Camera Presets  │
         │ • Stage 2: Fault Classify │                                                   │ • Staggered Boxer Layout  │
         └─────────────┬─────────────┘                                                   └─────────────┬─────────────┘
                       │                                                                               │
                       └───────────────────────────────────────┬───────────────────────────────────────┘
                                                               │
                                                               ▼
                                       ┌───────────────────────────────────────────────┐
                                       │       DECISION SUPPORT & PERSISTENCE          │
                                       ├───────────────────────────────────────────────┤
                                       │ • Sortie Debrief Report Generation            │
                                       │ • Forward What-If Mission Survivability       │
                                       │ • Grounded Plain-Language Copilot             │
                                       │ • Supabase PostgreSQL + Resilient Local Sync  │
                                       │ • Federated Learning (FedAvg Across 5 UAVs)   │
                                       │ • 1-Click CSV Flight Log & Print Export       │
                                       └───────────────────────────────────────────────┘
```

---

## 1. What Has Been Done (Independently Verified by Running the Code)

*Every claim in this section was checked by actually installing dependencies and executing the code —
not just read from prior documentation. See Section 4 for the exact commands used.*

### Core Physical Engine & 15 Diagnostic Sensor Channels
- **15 diagnostically-selected channels** (channel selection follows the *LiteInception* channel-selection
  study, arXiv:2604.01725):
  - Cylinder Head Temperatures: `E1_CHT1`–`E1_CHT4` (thermal inertia lag filter, $\tau = 30\text{s}$).
  - Exhaust Gas Temperatures: `E1_EGT1`–`E1_EGT4` (fast response, $\tau = 5\text{s}$).
  - Lubrication: `E1_OilT` ($\tau = 120\text{s}$) & `E1_OilP` (viscosity-coupled).
  - Fuel Metering: `E1_FFlow`.
  - Electrical: `volt1`, `volt2`, `amp1`, `amp2`.
- **7 flight/environmental regimes**: `PATROL`, `CLIMB`, `CRUISE`, `THIN-AIR (18,000 ft)`,
  `DESERT HEAT (48°C)`, `ARCTIC SUB-ZERO (-25°C)`, `COMBAT BURST`. Parameter values (RPM, GPH, CHT) for
  each regime are internally consistent within the simulator; they are engineering targets for this
  project's simulation, not measured data from a real aircraft.

### 2-Stage Machine Learning Cascade
- **Stage 1: Edge Anomaly Detector** ([`backend/models/stage1_detector.py`](backend/models/stage1_detector.py)):
  - Binary classifier tuned for high recall on rolling 90-second windows.
  - **Verified in-distribution (held-out flights, same distribution as training): ~100% recall, ~0.99 F1.**
  - **Verified out-of-distribution (trained on Patrol, tested on Climb with 2.5x sensor noise, flight-grouped
    split with no window leakage between train/test): ~79–80% F1.** This is the number that matters for
    credibility — it is consistent with, rather than higher than, the published literature this project
    cites (Wei et al., NGAFID-based studies report ~80–85% detection accuracy on real data). Run it yourself:
    `python -m backend.models.validate_ood`.
- **Stage 2: Ground Station Fault Classifier** ([`backend/models/stage2_classifier.py`](backend/models/stage2_classifier.py)):
  - Multi-class isolation of 5 FMEA-derived failure modes: `oil_cooler_degradation`,
    `cylinder_head_overheat`, `exhaust_valve_leak`, `alternator_rectifier_drift`, `fuel_flow_oscillation`.
  - Out-of-distribution fallback: triggers `"unknown_pattern"` if classifier certainty $< 0.60$.
  - Auditable safety threshold: an auto-action recommendation requires $\ge 0.90$ confidence (see
    `backend/config.py` — thresholds are named constants, not buried in business logic).

### Interactive 3D Spatial Twin ([`src/components/Scene3D.tsx`](src/components/Scene3D.tsx))
- **Procedurally-modeled geometry** built with Three.js / React Three Fiber — assembled from primitive
  shapes (cylinders, boxes) in code. This is a schematic, stylized representation for demo and
  fault-visualization purposes, **not an imported CAD model or an anatomically accurate engine reproduction.**
- Staggered boxer cylinder layout, live thermal heatmap color grading driven by simulated CHT/EGT values,
  an X-ray cutaway toggle, and 4 camera presets.
- Interactive cylinder selection: clicking a cylinder isolates its telemetry.

### Sortie Debrief Report Modal
- Displays peak CHT/EGT, oil pressure, bus voltages, Stage 1/2 classifier certainty, and an automated
  maintenance directive for the simulated flight, with print and CSV export.

### Supabase Cloud Database & Resilient Offline Sync
- PostgreSQL schema ([`backend/supabase_schema.sql`](backend/supabase_schema.sql)) for `flights`,
  `telemetry_logs`, `alerts`, `fleet_rounds`.
- Dual-mode client ([`backend/services/supabase_client.py`](backend/services/supabase_client.py)): connects
  to remote Supabase when credentials are present, falls back to local SQLite otherwise — verified to keep
  the test suite and offline demo working without network access.

### Grounded Plain-Language Copilot
- [`backend/services/llm_copilot.py`](backend/services/llm_copilot.py) grounds its responses in the
  flight's actual telemetry and the thresholds in `backend/config.py`, rather than generating free-form
  advice — answers questions like "why was this flagged?" using the flight's real fault/residual data as
  context.

### Live Telemetry Streaming & Autopilot Ingestion (pulled forward from roadmap)
- WebSocket-based live/replay telemetry streaming (`src/lib/useTelemetrySocket.ts`,
  `backend/main.py` `/api/ws/telemetry`).
- A MAVLink v1/v2 message parser (`backend/services/mavlink_ingest.py`) that can decode standard
  ArduPilot/PX4 engine telemetry messages (EFI_STATUS, SCALED_PRESSURE, SYS_STATUS) into this project's
  15-channel schema — built, but not yet connected to a real autopilot or SITL feed.

### Federated Learning Across Simulated UAVs
- `backend/models/federated_fleet.py` implements FedAvg-style weight aggregation across simulated UAV
  clients, where only model weight deltas — not raw telemetry — are shared between clients. This is a
  working simulation of the concept (multiple in-process clients), not a distributed multi-machine or
  multi-device deployment.

---

## 2. Independently Verified Test & Build Results

These results were reproduced by cloning the repository fresh, installing dependencies, and running the
commands below directly — not copied from prior notes.

```bash
# Backend test suite
python -m pytest backend/tests -v
# Result: 36 passed, 2 warnings (all passing)

# Frontend production build
npm install && npm run build
# Result: built in ~3s, zero TypeScript errors
# Note: emits a single ~1.2MB JS chunk — Vite suggests code-splitting;
# this does not block the build or the demo.

# Out-of-distribution / anti-leakage validation
python -m backend.models.validate_ood
# Result: ~100% recall / ~0.99 F1 in-distribution (held-out flights),
#         ~79-80% F1 out-of-distribution (unseen regime + injected noise)
```

Note on the OOD number: it will vary slightly run-to-run since the validation script does not fix a random
seed for the noise injection. Treat "~79-80%" as the honest range, not a single precise figure — this
matches the spirit of the published benchmarks it's compared against, which are themselves reported as
ranges (75-85%), not single decimal-point numbers.

---

## 3. What Is To Be Done (Future Roadmap — Not Yet Built)

| Milestone | Subsystem | Description |
|---|---|---|
| **Next** | **Live MAVLink/SITL connection** | Connect the existing `mavlink_ingest.py` parser to a real ArduPilot/PX4 SITL instance or hardware autopilot, rather than synthetic telemetry. |
| **Next** | **Aero CAN Bus Bridge** | Ingest native CANAerospace/UAVCAN engine telemetry from an EECU. |
| **Next** | **Active Retraining Pipeline** | Automatically trigger retraining when operator feedback flags false positives above a set threshold. |
| **Future** | **Acoustic/Vibration Twin** | Ingest piezoelectric accelerometer telemetry for bearing/piston-slap detection via FFT. |
| **Future** | **AR Headset Integration** | WebXR passthrough overlay of the 3D twin on a physical engine bench. |

---

## 4. Engineering Principles for Continued Development

1. **Ground every claim in something runnable.** Before stating a metric in documentation, run the
   relevant script or test and paste the actual output — not a remembered or estimated number.
2. **Keep the two-stage cascade intact.** The edge detector is a high-recall filter; the classifier only
   runs on flagged windows. Don't replace the physics-informed lag filters ($\tau_{\text{CHT}}=30s$,
   $\tau_{\text{Oil}}=120s$) with unconstrained models.
3. **Resilient local fallback.** Maintain the dual-mode pattern in `SupabaseService` and
   `useTelemetrySocket.ts` so the system works fully offline during judging.
4. **Disclose simplifications, don't imply precision you don't have.** If a number, model, or claim is an
   approximation or a stand-in (like the GA-engine-as-UAV-engine physics analog), say so directly in the
   documentation rather than stating it with unqualified confidence.
5. **Traceable thresholds.** Keep all safety-critical constants named and visible in `backend/config.py`.
6. **Cite only sources you can produce on request.** Before adding a citation, confirm it's a real,
   findable document — an unverifiable citation is a bigger credibility risk than citing fewer sources.

---

## 5. Getting Started & Demonstration Script

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.12/3.13)
- **Node.js:** v18+ (tested on Node.js v22/v24)

### Quick Start
```bash
git clone https://github.com/abhinavsingh2403/SIH-KA-PROJECT-.git
cd SIH-KA-PROJECT-

pip install -r backend/requirements.txt
pip install pytest scikit-learn scipy supabase

python -m uvicorn backend.main:app --port 8000 --host 0.0.0.0

# In a separate terminal:
npm install
npm run dev -- --host
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser. API docs at
`http://localhost:8000/docs`.

### Demonstration Flow
1. **Show a normal flight** — balanced 4-cylinder CHTs, steady oil pressure, smooth propeller rotation.
2. **Show the 3D twin's modes** — X-ray cutaway, thermal heatmap, camera presets. Be ready to say plainly
   that this is a procedural, stylized model, not an imported CAD asset, if asked.
3. **Change flight regime** (e.g., Climb, Desert Heat) — show the simulated parameters respond accordingly.
4. **Inject a fault** (e.g., Cylinder 2 overheat) — show Stage 1 trigger, Stage 2 classification, the
   cylinder's visual indicator changing, and the health score dropping.
5. **Open the debrief report** — show peak telemetry, classifier certainty, and the generated directive.
6. **Ask the copilot a grounded question** — show it answering from the flight's actual data, not generic
   advice.
7. **If asked about validation:** point directly to the OOD test in Section 2 and explain the flight-grouped
   train/test split — this is the strongest answer to "how do you know this isn't just overfitting to your
   own synthetic data."

---

## 6. Research Citations

1. Wei et al., *"An Intelligent Fault Diagnosis Method for General Aviation Aircraft Based on
   Multi-Fidelity Digital Twin and FMEA Knowledge Enhancement"* (arXiv:2604.22777).
2. Wei et al., *"LiteInception: An Efficient Deep Learning Architecture for Aircraft Engine Fault
   Diagnosis"* (arXiv:2604.01725) — source of the 15-channel selection methodology used here.
3. NGAFID (National General Aviation Flight Information Database), Aviation Maintenance Dataset
   (Kaggle: `hooong/aviation-maintenance-dataset-from-the-ngafid`) — the real-world benchmark dataset this
   project's methodology is validated against in spirit, even though this repository's models train on
   simulated data.
4. Lycoming IO-360-series published engine performance data — referenced (not directly reproduced) as the
   calibration basis for the semi-empirical transfer functions in `engine_simulator.py`. If specific
   published curves were used, cite the exact source/manual here; otherwise describe this honestly as
   "informed by publicly available Lycoming performance characteristics" rather than citing a specific
   uncredited document.

*Only sources that can be independently located and verified are listed here. If you add a citation, make
sure you can produce the actual document on request before including it.*
