# SIH26054 — AI-Enabled Real-Time Digital Twin for Aero Piston Engine Health Monitoring (MALE UAV)

> **Organization:** DRDO (Defense Research and Development Organisation)  
> **Problem Statement ID:** SIH26054 | **Category:** Software | **Theme:** Robotics and Drones  
> **Repository:** [abhinavsingh2403/SIH-KA-PROJECT-](https://github.com/abhinavsingh2403/SIH-KA-PROJECT-)

A 100% software-defined, physics-informed digital twin for a Medium-Altitude Long-Endurance (MALE) UAV 4-cylinder aero piston engine (Lycoming IO-360 class). It simulates high-fidelity telemetry across 15 critical sensor channels, injects realistic gradual FMEA degradation curves, detects anomalies in near real-time via a two-stage ML pipeline, tracks physics residuals, scores mission risk, and provides an interactive 3D spatial twin with live thermal heatmaps.

---

## 1. System Architecture

The core pipeline strictly enforces safety-critical sequencing:
$$\text{Sensor Telemetry} \longrightarrow \text{Edge Anomaly (Stage 1)} \longrightarrow \text{Ground Classification (Stage 2)} \longrightarrow \text{Physics Residuals} \longrightarrow \text{Decision Support}$$

```
[2.1 Synthetic Data Simulator] (15 channels: CHT1-4, EGT1-4, OilT, OilP, FF, V/A)
              │
              ▼
[2.2 FMEA Fault Injection Engine] (Gradual sigmoid thermal/mechanical degradation)
              │
              ▼
[2.3 Stage 1: Onboard/Edge Model] (High-recall binary anomaly detector)
              │  (triggers only on anomaly)
              ▼
[2.4 Stage 2: Ground Station Model] (Multi-class fault classifier + unknown pattern fallback)
              │
              ▼
[2.5 Digital Twin Residual Engine] (|actual - expected|, thermal inertia lag filters)
              │
              ▼
[2.6 Decision & Alerting Layer] (Auditable safety rule: 0.90 confidence for auto-action)
         ┌────┴────────────────────────┐
         ▼                             ▼
[2.7 LLM Plain-Language Copilot]   [2.8 Mission-Risk Scorer & What-If Engine]
         └────┬────────────────────────┘
              ▼
[2.9 Black-Box Replay Engine] (1x, 5x, 20x demo replay)
              │
              ▼
[2.10 Feedback & Accuracy Trend Loop]
```

---

## 2. What Has Been Done (Completed & Verified)

### ✅ Core Backend Modules (`backend/`)
- **2.1 Synthetic Engine Telemetry Simulator** ([`backend/simulator/engine_simulator.py`](backend/simulator/engine_simulator.py)):
  - Generates second-by-second time-series for the **15 core diagnostic channels** (LiteInception research: `E1_CHT1-4`, `E1_EGT1-4`, `E1_OilT`, `E1_OilP`, `E1_FFlow`, `volt1-2`, `amp1-2`).
  - Supports 3 flight mission presets: `patrol`, `climb`, and `cruise`.
  - Thermodynamic lag filters: CHT thermal inertia ($\tau = 30\text{s}$), Oil soak ($\tau = 120\text{s}$), EGT response ($\tau = 5\text{s}$).
- **2.2 FMEA Fault Injector** ([`backend/simulator/fault_injector.py`](backend/simulator/fault_injector.py)):
  - 5 realistic gradual failure curves: `oil_cooler_degradation`, `cylinder_head_overheat`, `exhaust_valve_leak`, `alternator_rectifier_drift`, `fuel_flow_oscillation`.
  - Smooth sigmoid degradation (no unrealistic step-jumps) with per-cylinder targeting and cross-contamination physics.
- **2.3 Stage 1 Onboard / Edge Anomaly Detector** ([`backend/models/stage1_detector.py`](backend/models/stage1_detector.py)):
  - Binary classifier tuned for high recall on rolling 90-second windows.
  - **Result: 97.9% Recall (0.9791), 0.9551 F1-Score** on holdout test set.
- **2.4 Stage 2 Ground Station Fault Classifier** ([`backend/models/stage2_classifier.py`](backend/models/stage2_classifier.py)):
  - 6-class fault classifier with feature importance sensor attribution.
  - **Result: 88.5% Accuracy (0.8845)**. F1 scores: Oil Cooler (0.97), Alternator (0.96), CHT Overheat (0.92).
  - Out-of-distribution handling: triggers `"unknown_pattern"` if confidence $< 0.60$.
- **2.5 Digital Twin Residual Engine** ([`backend/twin/residual_engine.py`](backend/twin/residual_engine.py)):
  - Computes physics $|actual - expected|$ baselines.
  - Calculates divergence slopes over rolling windows to distinguish true mechanical degradation from sensor noise.
  - Sensor sanity checks: distinguishes sensor electrical faults from true engine anomalies.
- **2.6 Decision & Alerting Engine** ([`backend/services/alerting.py`](backend/services/alerting.py)):
  - Composite severity scoring (`info`, `warning`, `critical`).
  - Strictly enforces `AUTO_ACTION_CONFIDENCE_THRESHOLD = 0.90` (below 0.90, human confirmation is mandatory).
- **2.7 LLM Report & Copilot Service** ([`backend/services/llm_copilot.py`](backend/services/llm_copilot.py)):
  - Generates 1-2 sentence plain-English operational situation reports.
  - Grounded Q&A copilot answering pilot queries ("Why was this flagged?", "Is it safe to fly tomorrow?").
- **2.8 Mission Risk Scorer & What-If Engine** ([`backend/services/mission_risk.py`](backend/services/mission_risk.py)):
  - Dynamic 0–100 health scoring ($<40$ Abort / RTB, $40-70$ Caution, $\ge 70$ Nominal).
  - Pre-takeoff "What-If" mode: forward-projects health trend across planned sortie duration to estimate survivability and safe flight window.
- **2.9 Black-Box Replay & 2.10 Feedback Loop**:
  - Full telemetry logging with adjustable playback speeds (1x, 5x, 20x).
  - Operator validation feedback (`true_positive`, `false_positive`, `missed_fault`) to track historical model accuracy.
- **FastAPI REST Application** ([`backend/main.py`](backend/main.py)):
  - Exposes all 10 modules through interactive Swagger UI at `/docs`.

### ✅ Interactive 3D Digital Twin (`src/`)
- **4-Cylinder Boxer Engine Spatial Model** ([`src/components/Scene3D.tsx`](src/components/Scene3D.tsx)):
  - Built with Three.js and React Three Fiber at locked 60 FPS.
  - Horizontally-opposed boxer layout with 4 finned cylinder barrels, cylinder heads, and exhaust runners.
  - Live thermal CHT/EGT heatmap color grading (Nominal `#10b981` $\to$ Caution `#f59e0b` $\to$ Critical `#ef4444`).
  - Rotating 2-blade UAV propeller coupled to engine RPM, front oil cooler radiator, and rear alternator bus.
  - Interactive cylinder selection: clicking any cylinder isolates its telemetry.
- **Command Center Overlay HUD** ([`src/components/OverlayHUD.tsx`](src/components/OverlayHUD.tsx)):
  - Glassmorphic telemetry HUD displaying live 4-cylinder CHT status cards, Oil Temp/Pressure, Bus Volts, and RPM.
  - Interactive FMEA fault injection triggers (`Nominal Clean`, `Cyl 2 Overheat`, `Oil Cooler Loss`, `Alternator Sag`).
  - Theme palette selector supporting 5 industry color schemes.

### ✅ Test Suite & Verification
- `python -m pytest backend/tests -v` $\to$ **26/26 tests passing (100%)**:
  - 16 physics & fault simulator tests
  - 8 digital twin, alerting, risk, and copilot tests
  - 2 full-pipeline end-to-end FastAPI integration tests
- `npm run build` $\to$ **Clean production build in 2.74s (zero TypeScript errors)**.

---

## 3. What Has To Be Done (Future Roadmap)

| Priority | Feature / Phase | Status | Description |
|---|---|---|---|
| **Phase 1** | **Live WebSocket Telemetry Streaming** | ✅ **COMPLETE** | Bi-directional streaming WebSocket at `/api/ws/telemetry/{flight_id}` streaming 15-channel packets, live RPM, alerts, and accepting control commands (play/pause/1x-20x/seek/fault injection). |
| **Phase 2** | **Exploded CAD View Animation** | ✅ **COMPLETE** | Interactive 3D spatial separation mode in `Scene3D.tsx` smoothly disassembling the 4 cylinders, propeller assembly, oil cooler, and alternator. |
| **Phase 3** | **MAVLink / GCS Protocol Ingestion** | ⏳ *Planned* | Add a MAVLink message parser to accept real ArduPilot/PX4 or SITL telemetry feeds into the Digital Twin. |
| **Phase 4** | **Active Retraining on Feedback** | ⏳ *Planned* | Wire the operator feedback loop (`/api/feedback`) to trigger automated fine-tuning runs when false alarms or missed faults exceed 5%. |
| **Phase 5** | **Federated Learning Fleet Framing** | ⏳ *Planned* | Intersperse edge-model weight delta aggregation across multiple UAV squadrons to enable collective intelligence without sharing classified flight telemetry. |

---

## 4. Getting Started

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.13)
- **Node.js:** v18+ (tested on Node.js v24)

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/abhinavsingh2403/SIH-KA-PROJECT-.git
cd SIH-KA-PROJECT-

# Install Python dependencies
pip install -r backend/requirements.txt
pip install pytest scikit-learn scipy

# Run all backend unit & integration tests
python -m pytest backend/tests -v

# Start the FastAPI server (Port 8000)
python -m uvicorn backend.main:app --reload --port 8000
```
*API documentation and testing interface will be live at `http://localhost:8000/docs`.*

### 2. Frontend Setup
```bash
# Install frontend packages
npm install

# Start Vite development server
npm run dev

# Build for production
npm run build
```
*Frontend 3D Digital Twin will be accessible at `http://localhost:5173`.*

---

## 5. Repository Structure

```
SIH-KA-PROJECT-/
├── backend/
│   ├── config.py              # Auditable thresholds (0.90 auto-action, 0.60 unknown fault)
│   ├── schemas.py             # Pydantic v2 contracts for all 10 modules
│   ├── main.py                # FastAPI app exposing all endpoints
│   ├── requirements.txt
│   ├── simulator/
│   │   ├── engine_simulator.py  # 15-channel semi-empirical physics engine
│   │   └── fault_injector.py    # 5 FMEA gradual degradation fault models
│   ├── models/
│   │   ├── features.py          # 90-dim windowed feature extractor
│   │   ├── stage1_detector.py   # Edge binary anomaly detector (97.9% recall)
│   │   └── stage2_classifier.py # Ground multi-class classifier (88.5% acc)
│   ├── twin/
│   │   └── residual_engine.py   # Digital Twin physics residuals & sensor checks
│   ├── services/
│   │   ├── alerting.py          # Safety rule & decision layer
│   │   ├── mission_risk.py      # Mission health score & What-If survivability
│   │   └── llm_copilot.py       # Grounded plain-English debriefs & Q&A
│   ├── scripts/
│   │   ├── generate_dataset.py  # Dataset synthesis script
│   │   └── train_pipeline.py    # Model training & evaluation pipeline
│   └── tests/
│       ├── test_simulator.py    # Physics & fault injection tests (16 tests)
│       ├── test_twin_and_services.py # Twin & services tests (8 tests)
│       └── test_api_endpoints.py # End-to-end API integration tests (2 tests)
├── data/
│   └── models/                # Serialized trained models (joblib)
├── docs/                      # Original DRDO specifications
├── src/
│   ├── components/
│   │   ├── Scene3D.tsx        # 4-cylinder Boxer 3D Digital Twin (R3F)
│   │   └── OverlayHUD.tsx     # Command center HUD & fault triggers
│   ├── lib/
│   │   ├── utils.ts           # cn() helper
│   │   └── motion.ts          # Reusable Framer Motion variants
│   ├── types/
│   │   └── telemetry.ts       # TypeScript schemas matching backend Pydantic models
│   ├── App.tsx
│   └── index.css
├── OPUS_ROADMAP.md            # Comprehensive developer handoff roadmap
├── package.json
└── vite.config.ts
```

---

## 6. Research Citations

1. **Wei et al.**, *"An Intelligent Fault Diagnosis Method for General Aviation Aircraft Based on Multi-Fidelity Digital Twin and FMEA Knowledge Enhancement"* (arXiv:2604.22777).
2. **Wei et al.**, *"LiteInception: An Efficient Deep Learning Architecture for Aircraft Engine Fault Diagnosis"* (arXiv:2604.01725) — channel selection study.
3. **NGAFID** (National General Aviation Flight Information Database), Aviation Maintenance Dataset (Kaggle: `hooong/aviation-maintenance-dataset-from-the-ngafid`).
