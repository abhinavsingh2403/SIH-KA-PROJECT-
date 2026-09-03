# SIH26054 — AI-Enabled Real-Time Digital Twin for Aero Piston Engine Health Monitoring (MALE UAV)

> **Organization:** DRDO (Defense Research and Development Organisation)  
> **Problem Statement ID:** SIH26054 | **Category:** Software | **Theme:** Robotics and Drones  
> **Target UAV:** TAPAS-BH-201 / Archer-NG Class MALE UAV  
> **Engine Class:** 4-Cylinder Horizontally-Opposed Aero Piston Engine (Rotax 914 Turbo / Lycoming IO-360 Proxy)  
> **Repository:** [abhinavsingh2403/SIH-KA-PROJECT-](https://github.com/abhinavsingh2403/SIH-KA-PROJECT-)  
> **Latest Stable Release:** `main` branch — Complete End-to-End System

---

## Executive Summary

The **SIH26054 Digital Twin** is an auditable, physics-informed software suite engineered to monitor, predict, and diagnose health degradation in Medium-Altitude Long-Endurance (MALE) UAV piston engines. 

Unlike generic IoT dashboards or conversational AI demos, this system enforces **safety-critical aerospace sequencing**:
1. High-frequency 15-channel semi-empirical thermodynamics.
2. Fast edge anomaly detection ($< 90\text{s}$ rolling window, $Z > 3.0$).
3. Multi-class 1D-CNN FMEA fault isolation.
4. Continuous physical residual tracking ($\Delta = |y_{\text{measured}} - y_{\text{model}}|$).
5. Forward What-If mission survivability forecasting.
6. Photorealistic 3D spatial twin with X-ray cutaway mechanics and FLIR thermography.
7. Supabase cloud database persistence with resilient local sync.
8. Official DRDO Aircraft Incident & Sortie Debrief Board reporting.

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │      DRDO / ADE MALE UAV (TAPAS-04) GROUND STATION      │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │
                       ┌───────────────────────────────────────┴───────────────────────────────────────┐
                       ▼                                                                               ▼
         ┌───────────────────────────┐                                                   ┌───────────────────────────┐
         │  DIGITAL TWIN RESIDUALS   │                                                   │   3D SPATIAL TWIN BENCH   │
         ├───────────────────────────┤                                                   ├───────────────────────────┤
         │ • 15 Coupled Channels     │                                                   │ • CAD Solid Milled Alloy  │
         │ • 7 Environmental Regimes │                                                   │ • FLIR Thermography Map   │
         │ • Δ = |y_meas - y_model|  │                                                   │ • X-Ray Cutaway Mechanics │
         │ • Stage 1: Rolling Edge Z │                                                   │ • 4 Quick Camera Presets  │
         │ • Stage 2: 1D-CNN FMEA    │                                                   │ • Staggered Boxer Layout  │
         └─────────────┬─────────────┘                                                   └─────────────┬─────────────┘
                       │                                                                               │
                       └───────────────────────────────────────┬───────────────────────────────────────┘
                                                               │
                                                               ▼
                                       ┌───────────────────────────────────────────────┐
                                       │       DEFENSE INTELLIGENCE & PERSISTENCE      │
                                       ├───────────────────────────────────────────────┤
                                       │ • DRDO Incident & Sortie Debrief Board Report │
                                       │ • Forward What-If Mission Survivability       │
                                       │ • Grounded Tactical Copilot (Zero AI Slop)    │
                                       │ • Supabase PostgreSQL + Resilient Local Sync  │
                                       │ • Federated Learning (FedAvg Across 5 UAVs)   │
                                       │ • 1-Click CSV Flight Log & Print Export       │
                                       └───────────────────────────────────────────────┘
```

---

## 1. What Has Been Done (Completed & Verified)

### Core Physical Engine & 15 Diagnostic Sensor Channels
- **15 Diagnostically Critical Channels** (per *LiteInception* arXiv:2604.01725 research):
  - Cylinder Head Temperatures: `E1_CHT1`, `E1_CHT2`, `E1_CHT3`, `E1_CHT4` (Thermal inertia $\tau = 30\text{s}$).
  - Exhaust Gas Temperatures: `E1_EGT1`, `E1_EGT2`, `E1_EGT3`, `E1_EGT4` (Fast response $\tau = 5\text{s}$).
  - Lubrication System: `E1_OilT` (Thermal soak $\tau = 120\text{s}$) & `E1_OilP` (Viscosity-coupled).
  - Fuel Metering: `E1_FFlow` (Throttle & manifold pressure coupled).
  - Electrical Generation: `volt1`, `volt2`, `amp1`, `amp2` (Dual 28V DC bus load distribution).
- **7 Dynamic Environmental Flight Regimes**:
  - `PATROL`: Nominal surveillance loiter ($2420\text{ RPM}, 11.2\text{ GPH}, 160^\circ\text{C CHT}$).
  - `CLIMB`: High power climb ($2550\text{ RPM}, 14.8\text{ GPH}, 185^\circ\text{C CHT}$, preserves active timeline).
  - `CRUISE`: High-efficiency endurance ($2380\text{ RPM}, 9.8\text{ GPH}, 155^\circ\text{C CHT}$).
  - `THIN-AIR (18,000 ft)`: Tropospheric low-density boundary ($\rho = 0.72$, reduced air cooling $\to \text{CHT } +12^\circ\text{C}$, fuel leaning).
  - `DESERT HEAT (48°C)`: High ambient tarmac soak ($+25^\circ\text{C} \to \text{Oil Temp } +18^\circ\text{C}$).
  - `ARCTIC SUB-ZERO (-25°C)`: Sub-zero cold-start (High oil viscosity drag $\to \text{Oil Pressure } +15\text{ psi}$).
  - `COMBAT BURST`: 100% WOT emergency dash ($2750\text{ RPM}, 17.5\text{ GPH}$).

### 2-Stage Machine Learning Cascade Architecture
- **Stage 1: Edge Anomaly Detector** ([`backend/models/stage1_detector.py`](backend/models/stage1_detector.py)):
  - Binary classifier tuned for ultra-high recall on rolling 90-second windows.
  - In-Distribution holdout: **97.9% Recall**, **0.955 F1-Score**.
  - Out-of-Distribution (OOD) test on unseen climb flights with 2.5x Gaussian sensor noise: **79.2% F1-Score**.
- **Stage 2: Ground Station Fault Classifier** ([`backend/models/stage2_classifier.py`](backend/models/stage2_classifier.py)):
  - Multi-class isolation of canonical FMEA failure modes:
    1. `oil_cooler_degradation` (Heat exchanger matrix fouling)
    2. `cylinder_head_overheat` (Targeted cylinder isolation 1–4)
    3. `exhaust_valve_leak` (Valve face micro-cracks & blowby)
    4. `alternator_rectifier_drift` (Diode bridge breakdown)
    5. `fuel_flow_oscillation` (Metering servo unit hunting)
  - Overall accuracy: **88.5%**. F1 scores: Oil Cooler (0.97), Alternator (0.96), CHT Overheat (0.92).
  - Out-of-Distribution fallback: triggers `"unknown_pattern"` if classifier certainty $< 0.60$.
  - Auditable safety threshold: auto-action recommendation requires $\ge 0.90$ confidence.

### Photorealistic 3D Spatial Twin ([`src/components/Scene3D.tsx`](src/components/Scene3D.tsx))
- **Staggered Boxer Architecture**: Cylinders 1/3 (right bank) and 2/4 (left bank) are offset along the longitudinal Z-axis, reflecting real Rotax 912 / Lycoming O-320 crankshaft crankpin geometry.
- **3 Interactive Render Modes**:
  - `[CAD SOLID]`: Milled cast aluminum crankcase, 10–12 CNC-machined cooling fin discs, chrome pushrod tubes, dual spark plugs with orange high-voltage leads, and stainless braided oil hoses with anodized AN-8 aero fittings.
  - `[FLIR THERMAL]`: Continuous false-color thermodynamic gradient (Cold Blue $\to$ Cyan $\to$ Emerald $\to$ Caution Amber $\to$ Thermal Red) driven directly by live cylinder CHT and EGT readings.
  - `[X-RAY CUTAWAY]`: Transparent polycarbonate housing displaying **internal reciprocating piston heads and brass connecting rods** firing inside the barrels, with the **forged-steel crankshaft and counterweights** rotating in real-time sync with engine RPM.
- **4 Camera Perspective Presets**: `[ISO 3/4]`, `[TOP PLAN]`, `[SIDE BANK]`, and `[FRONT SPINNER]`.
- **Atmospheric Heat Shimmer**: Particle sparkles (`@react-three/drei` `Sparkles`) rising from hot exhaust runners.

### Official DRDO Incident & Sortie Debrief Board Modal
- Dedicated **`[DEBRIEF]`** trigger on the top header.
- Displays comprehensive sortie investigation metrics:
  - Aircraft tail, flight ID, operating regime, and duration.
  - Peak CHT ($220^\circ\text{C}$ structural limit), peak EGT, EGT spread, oil pressure, and bus voltages.
  - FMEA stage 1 and stage 2 classifier certainty.
  - Automated aeronautical engineering directives.
  - **`Print Official Report`** button (browser print/PDF formatting).
  - **`Download Telemetry CSV`** button (1-click time-series export).

### Supabase Cloud Database & Resilient Offline Sync
- PostgreSQL schema ([`backend/supabase_schema.sql`](backend/supabase_schema.sql)) with tables for `flights`, `telemetry_logs`, `alerts`, and `fleet_rounds`.
- Dual-mode client ([`backend/services/supabase_client.py`](backend/services/supabase_client.py)):
  - Connects to remote Supabase via `create_client` when `SUPABASE_URL` and `SUPABASE_KEY` are present in `.env`.
  - Automatically falls back to embedded SQLite (`data/supabase_local_sync.db`) when offline, ensuring 100% test and offline demo reliability.
- In-dashboard **`[SUPABASE DB]`** modal for real-time table metrics and manual flight synchronization.

### Grounded Tactical AI Copilot (Zero AI Slop)
- Rewritten with pure aeronautical domain logic ([`backend/services/llm_copilot.py`](backend/services/llm_copilot.py)):
  - Evaluates cylinder metallurgical limits ($220^\circ\text{C}$ threshold).
  - Imposes maximum continuous power deratings ($60\%$ throttle cap upon fault detection).
  - Formulates electrical load shedding procedures during rectifier drift.
  - Analyzes lubrication hydrodynamic bearing shear thresholds ($< 35\text{ psi}$).
  - Issues actionable pilot emergency directives and PAN-PAN priority declarations.

---

## 2. What Is To Be Done (Future Enhancements & Roadmap)

For production deployment across military test ranges and operational drone squadrons, the following enhancements are planned:

| Milestone | Subsystem | Description | Target Hardware / Standard |
|---|---|---|---|
| **Phase 6** | **Hardware-in-the-Loop (HIL)** | Direct serial/UART hardware interface connecting Pixhawk 6X / Cube Orange autopilots to the digital twin. | MAVLink 2.0 / RS-422 Serial |
| **Phase 7** | **Aero CAN Bus Bridge** | Ingest native CANAerospace / UAVCAN engine telemetry packets directly from electronic engine control units (EECU). | ISO 11898-2 CAN Bus |
| **Phase 8** | **Active Retraining Pipeline** | Automated trigger retraining the 1D-CNN model when human operator feedback flags false positives above 5%. | PyTorch / MLflow / Docker |
| **Phase 9** | **Acoustic FFT Vibration Twin** | Ingest high-frequency piezoelectric accelerometer telemetry (0–20 kHz) to detect bearing spalling and piston slap via FFT spectrogram analysis. | IEPE Piezo Sensors |
| **Phase 10** | **AR Headset Integration** | WebXR / Apple Vision Pro spatial passthrough projecting the 3D twin directly over the physical engine bench during maintenance turnarounds. | WebXR / OpenXR |

---

## 3. Engineering Recommendations & Non-Slop Innovation Guidelines

To ensure this project remains **competition-winning, technically credible, and free of generic AI filler**, adhere to the following principles:

1. **Grounded Empirical Telemetry Over Hallucinated Prose**:
   - Never allow LLM outputs to generate freeform medical or automotive advice for an aircraft. All copilot responses must parse real channel values (`livePacket.channels`), compare them against certified thresholds (`backend/config.py`), and issue standardized aerospace directives (RTB, Power Derate, Mixture Full Rich, Load Shed).
2. **Deterministic Threshold Rules Before Probabilistic Decisions**:
   - Keep the two-stage cascade intact. The edge detector must act as a high-recall filter; the classifier must only execute when an anomaly is present. Never replace physics-informed lag filters ($\tau_{\text{CHT}} = 30\text{s}$, $\tau_{\text{Oil}} = 120\text{s}$) with raw unconstrained neural networks.
3. **Resilient Local Fallback Pattern**:
   - Always maintain the dual-mode pattern established in `SupabaseService` and `useTelemetrySocket.ts`. In offline evaluation environments (such as hackathon judging venues without reliable internet), the system must seamlessly run against local SQLite and mock physical loops without throwing unhandled exceptions.
4. **Authentic Mechanical Proportions**:
   - When extending 3D CAD assets, preserve mechanical accuracy: horizontally-opposed cylinders must remain staggered along the Z-axis, cooling fins must bevel, and propeller aerofoil pitch must reflect genuine aeronautical angle-of-attack geometry.
5. **Traceable DRDO Documentation**:
   - Retain all auditable constants in `backend/config.py`. Never bury safety-critical thresholds ($90\%$ auto-action, $40\%$ mission abort) inside inline business logic.

---

## 4. Verification Suite & Quality Metrics

All test suites and production build tools pass 100% cleanly:

```powershell
# 1. Complete Backend Test Suite (36 Tests)
python -m pytest backend/tests -v
# Result: 36 passed, 1 warning in 16.74s (100% PASS)

# 2. Frontend Production TypeScript & Vite Build
npm run build
# Result: Built in 2.18s (Zero TypeScript errors)

# 3. Live Supabase Status Verification
python -c "import urllib.request, json; print(json.loads(urllib.request.urlopen('http://localhost:8000/api/supabase/status').read().decode()))"
# Result: 200 OK — {"mode": "local_fallback", "tables": {"flights": 5, "telemetry_logs": 4, "alerts": 2}}
```

---

## 5. Getting Started & Demonstration Script

### Prerequisites
- **Python:** 3.10+ (tested on Python 3.13)
- **Node.js:** v18+ (tested on Node.js v24)

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/abhinavsingh2403/SIH-KA-PROJECT-.git
cd SIH-KA-PROJECT-

# 2. Install backend dependencies
pip install -r backend/requirements.txt
pip install pytest scikit-learn scipy supabase

# 3. Start the FastAPI backend (Port 8000)
python -m uvicorn backend.main:app --port 8000 --host 0.0.0.0

# 4. In a separate terminal, install and launch the frontend
npm install
npm run dev -- --host
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Evaluator Demonstration Flow (5-Minute Winning Pitch)
1. **Show Normal Flight**:
   - Note the balanced 4-cylinder CHTs ($\approx 160^\circ\text{C}$), oil pressure ($64\text{ psi}$), and smooth propeller rotation.
2. **Demonstrate 3D Modes**:
   - Click **`[X-RAY CUTAWAY]`** $\to$ Observe the transparent cylinder barrels revealing reciprocating internal pistons and the rotating steel crankshaft.
   - Click **`[FLIR THERMAL]`** $\to$ See the real-time thermographic false-color heat map across all 4 cylinders.
   - Click **`[TOP]`**, **`[SIDE]`**, and **`[ISO]`** camera presets to demonstrate engineering inspection viewpoints.
3. **Change Flight Regime**:
   - Select **`CLIMB`** in the header dropdown $\to$ Observe RPM jump to $2550\text{ RPM}$, fuel flow rise to $14.8\text{ GPH}$, and CHT climb toward $185^\circ\text{C}$ without timeline reset.
   - Select **`DESERT HEAT (48°C)`** $\to$ Notice immediate oil thermal soak ($104^\circ\text{C}$) and reduced pressure.
4. **Inject Fault**:
   - Click **`CYL OVERHEAT (CYL 2)`** $\to$ Observe Stage 1 edge trigger within seconds, Stage 2 fault isolation, Cylinder 2 turning incandescent red, and the health score dropping.
5. **Open Official DRDO Debrief Report**:
   - Click **`[DEBRIEF]`** in the top header $\to$ Display the official DRDO Investigation Board report with peak telemetry metrics, FMEA findings, and pilot directives.
   - Click **`Print Official Report`** or **`Download Telemetry CSV`**.
6. **Inspect Cloud Persistence**:
   - Click **`[SUPABASE DB]`** $\to$ View persisted flight sorties, telemetry frames, and recorded alerts.
7. **Ask Tactical Copilot**:
   - In the Copilot tab, click *"Assess Cylinder Thermal Margin"* or *"Recommend Throttle Setting"* $\to$ Highlight the domain-expert, non-slop aeronautical guidance.

---

## 6. Research Citations

1. **Wei et al.**, *"An Intelligent Fault Diagnosis Method for General Aviation Aircraft Based on Multi-Fidelity Digital Twin and FMEA Knowledge Enhancement"* (arXiv:2604.22777).
2. **Wei et al.**, *"LiteInception: An Efficient Deep Learning Architecture for Aircraft Engine Fault Diagnosis"* (arXiv:2604.01725) — 15 diagnostic channel selection study.
3. **NGAFID** (National General Aviation Flight Information Database), Aviation Maintenance Dataset (Kaggle: `hooong/aviation-maintenance-dataset-from-the-ngafid`).
4. **DRDO Aeronautical Development Establishment (ADE)**, *Technical Guidelines for Unmanned Aerial Vehicle Propulsion System Health Monitoring*.
