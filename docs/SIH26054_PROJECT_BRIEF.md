# SIH26054 — AI-Enabled Real-Time Digital Twin for Aero Piston Engine Health Monitoring (MALE UAV)

**PS ID:** SIH26054 | **Organization:** DRDO | **Category:** Software | **Theme:** Robotics and Drones

This is a **software-only** project (no hardware required). It simulates a MALE UAV
piston engine, injects realistic faults into that simulation, detects and classifies
those faults in near real-time using a two-stage ML pipeline, explains them in plain
language, scores mission risk, and exposes everything through a dashboard-ready API.

**Core sequencing (do not build these out of order):**
`monitor engine sensors → detect anomaly → classify fault → THEN help the pilot decide what to do`
The pilot-facing layer (plain-language reports, mission-risk recommendation) is the
*last* stage, gated behind fault detection — not a parallel or earlier feature.

---

## 1. Architecture

```
[Data Simulator] -> [Fault Injector] -> [Stage 1: Onboard/Edge Model]
                                                |
                                    (if anomaly flagged)
                                                v
                                    [Stage 2: Ground Station Model]
                                                v
                                [Digital Twin Residual Engine] (physics-expected vs real)
                                                v
                                [Decision & Alerting Layer] --- safety threshold rules
                                        /              \
                        [LLM Report + Copilot]   [Mission-Risk Scorer]
                                        \              /
                                [Dashboard API + Black-Box Recorder]
                                                v
                                [Feedback / Self-Correction Loop]
```

Since no real UAV or classified telemetry is available, the "physical layer" is
replaced by a **synthetic data generator + fault injector** — the standard, citable
approach used in the published research this project is based on (JSBSim + FMEA-driven
fault injection).

---

## 2. Modules

### 2.1 Data Simulator Service
**Purpose:** Generates a realistic flight's worth of engine sensor data, second by second.
- **Input:** flight duration, throttle/mission profile (presets: patrol, high-load climb, cruise)
- **Output:** time series for the 15 core channels (see Section 4 — sensor channel list)
- **Method:** JSBSim (open-source 6-DoF flight dynamics engine) driving semi-empirical
  sensor synthesis equations, OR a lighter pure-Python physics-lite generator if JSBSim
  integration takes too long
- Runs "ahead of time" for demo data, and can also run "live" (streamed second-by-second)

**Endpoint**
```
POST /api/simulate/flight
body: { duration_minutes, profile, engine_id }
returns: { flight_id, stream_url }
```

**Status: IMPLEMENTED** — see `piston_engine_digital_twin_sim.py`, which uses JSBSim's
c172p model. Gap to close: spec's sensor list has per-cylinder CHT1-4/EGT1-4; current
script outputs single engine-wide CHT/EGT — needs small per-cylinder offset synthesis
if the exact 15-channel list is required.

### 2.2 Fault Injection Engine
**Purpose:** Deliberately corrupts the simulated sensor stream to mimic real faults,
using FMEA (Failure Mode and Effects Analysis) — the standard, published, citable
method for this exact problem when real fault data isn't available.

Fault library (start with 5-6, not all 19 — pick ones with clean physical stories):
- Oil cooler degradation (slow OilT rise, OilP drop)
- Cylinder head overheat (single-cylinder CHT spike)
- Exhaust/valve fault (EGT anomaly on one cylinder)
- Electrical/alternator fault (amp1/amp2 drift)
- Fuel flow irregularity (FF oscillation)

Each fault has a physical propagation model — it degrades gradually over the flight
(matches real research findings), not a step-jump to "broken."

**Endpoint**
```
POST /api/simulate/inject-fault
body: { flight_id, fault_type, onset_time_pct, severity }
returns: { fault_id, affected_channels }
```

**Status: IMPLEMENTED** — current script's fault set (cooling_system_fault,
intake_blockage, volumetric_efficiency_fault, fuel_system_fault, mechanical_wear) is
engine-wide rather than per-cylinder; conceptually equivalent, gradual ramps already
match the spec's "no step-jumps" requirement.

### 2.3 Stage 1 — Onboard/Edge Model (fast, lightweight)
**Purpose:** Answers ONE question fast: "normal or not normal?"
- Binary classifier, tuned for **high recall** (better a false alarm than a missed fault)
- Outputs a confidence score, not just yes/no
- Runs on every incoming rolling window (e.g. last 60-120 seconds)
- Only when it flags "anomalous" does the pipeline call Stage 2

**Endpoint**
```
POST /api/stage1/check
body: { flight_id, window_start, window_end, sensor_data }
returns: { is_anomalous: bool, confidence: float }
```

**Status: NOT YET BUILT**

### 2.4 Stage 2 — Ground Station Model (deep classification)
**Purpose:** Only triggered when Stage 1 flags something. Fine-grained fault classification.
- Multi-class classifier over the fault library (2.2)
- Outputs predicted fault type + confidence
- **Unknown-fault handling:** if top prediction confidence < threshold (e.g. 60%),
  output `"unknown_pattern"` instead of forcing a guess — flag for manual review
- Basic explainability: which sensor channel(s) and time window contributed most

**Endpoint**
```
POST /api/stage2/classify
body: { flight_id, window_start, window_end, sensor_data }
returns: { fault_type: string | "unknown_pattern", confidence: float, key_sensors: [string], key_time_range: [start, end] }
```

**Status: NOT YET BUILT**

### 2.5 Digital Twin / Residual Engine
**Purpose:** The "physics-informed" half of the twin. Keeps a running "expected"
value per sensor per flight phase, and computes the gap (residual) between expected
and actual.
- Maintains expected-value curves per engine profile (e.g. cruise vs. climb baselines)
- Computes residual = |actual - expected| per channel, per timestep
- **Trend tracking:** flags residuals that keep *growing* across the flight (single
  spikes = noise, growing trend = real degradation)
- Also runs a lightweight **sensor-health check**: distinguishes "sensor itself is
  faulty" (erratic/impossible readings) from "engine is faulty" (physically plausible
  but abnormal readings)

**Endpoint**
```
GET /api/twin/residuals?flight_id=xxx
returns: { channel: [{ t, expected, actual, residual }] }
```

**Status: NOT YET BUILT**

### 2.6 Decision & Alerting Layer
**Purpose:** Converts model outputs into ranked, actionable alerts, and enforces the
safety rule for any auto-action.
- Alert severity = f(Stage 1 confidence, Stage 2 confidence, residual trend)
- **Safety rule (hard-coded, not learned):**
  ```
  IF confidence >= AUTO_ACTION_CONFIDENCE_THRESHOLD (e.g. 0.90):
      -> allowed to surface an auto-action recommendation (e.g. "Recommend RTB")
  ELSE:
      -> alert-only, always requires human confirmation
  ```
  This threshold must be a named constant in config, not buried in code — auditable.
- Logs every alert (for the feedback loop, Section 2.10)

**Endpoint**
```
GET /api/alerts?flight_id=xxx
returns: [{ alert_id, severity, fault_type, confidence, auto_action_eligible, timestamp }]
```

**Status: NOT YET BUILT**

### 2.7 LLM Report + Copilot Service
**Purpose:** Turns raw model output into plain-language explanations, and answers
follow-up questions. **This is the pilot-facing layer — build it last, after
detection/classification/alerting work.**

- **Report generation:** given fault classification + key sensors + key time range,
  calls an LLM API with a structured prompt to produce a 1-2 sentence plain-English
  explanation (e.g. "Cylinder 2 temperature rising steadily since minute 40, pattern
  consistent with past oil-cooler faults, recommend inspection before next sortie.")
- **Copilot chat:** a chat endpoint scoped to one flight's data — operator can ask
  "why did you flag this?" or "is it safe to fly tomorrow?" and the LLM answers using
  the flight's fault/residual data as context (no external knowledge, stay grounded)

**Endpoints**
```
POST /api/report/generate
body: { alert_id }
returns: { report_text }

POST /api/copilot/chat
body: { flight_id, message, conversation_history }
returns: { reply }
```

**Status: NOT YET BUILT** (Phase 2 priority)

### 2.8 Mission-Risk Scorer
**Purpose:** Converts engine health into a mission-level decision, not just an
engine-level alert — directly answers "Mission Reliability" in the PS title.

Simple rule-based scoring (no ML needed here — transparency matters more):
```
health_score = weighted combination of:
    - active alert severities
    - residual trend steepness
    - time-in-flight remaining vs fault trend
IF health_score < 40: "Recommend abort / return to base"
IF 40 <= health_score < 70: "Continue with caution, shorten mission if possible"
IF health_score >= 70: "Continue mission normally"
```

**"What-if" mode:** given a *planned* mission duration (before takeoff), fast-forwards
the current health trend to estimate whether the engine will likely survive the full
planned duration, and suggests a safe mission length.

**Endpoints**
```
GET /api/mission-risk?flight_id=xxx
returns: { health_score, recommendation }

POST /api/mission-risk/what-if
body: { engine_id, planned_duration_minutes }
returns: { survivable: bool, safe_duration_estimate, recommendation }
```

**Status: NOT YET BUILT** (Phase 2 priority — high differentiation value)

### 2.9 Black-Box Recorder + Replay
**Purpose:** Stores every flight's full sensor history + every alert raised, and lets
any past flight be replayed on the dashboard as if it were happening live (huge for demos).
- Every flight simulated (2.1) is persisted in full
- Replay endpoint streams stored data back at adjustable speed (1x, 5x, 20x) so a full
  flight can be demoed in under a minute

**Endpoint**
```
GET /api/replay/{flight_id}?speed=5x
returns: streamed sensor + alert events, replayed in time order
```

**Status: NOT YET BUILT** (get at least a partial version working in Phase 1 — carries the demo)

### 2.10 Feedback / Self-Correction Loop
**Purpose:** Lets the system's accuracy visibly improve over time — shows "real-world
AI system" thinking.
- After a flight, operator marks each alert as `true_positive` / `false_positive` / `missed_fault`
- Store this feedback; periodically (or on-command) show accuracy trend over the last N flights
- **Stretch goal only:** actually retraining Stage 1/2 on this feedback. For SIH
  timeframe, tracking + displaying the trend is enough — don't over-build this part.

**Endpoints**
```
POST /api/feedback
body: { alert_id, verdict: "true_positive" | "false_positive" | "missed_fault" }

GET /api/feedback/accuracy-trend
returns: [{ flight_id, accuracy_pct }]
```

**Status: NOT YET BUILT** (Phase 3, stretch)

---

## 3. Data Model (core tables/collections)

```
flights
  id, engine_id, start_time, duration_minutes, profile

sensor_readings
  id, flight_id, timestamp, channel_name, value

faults_injected
  id, flight_id, fault_type, onset_time, severity, affected_channels

alerts
  id, flight_id, timestamp, fault_type, confidence,
  severity, key_sensors, auto_action_eligible, report_text

feedback
  id, alert_id, verdict, timestamp

mission_risk_log
  id, flight_id, timestamp, health_score, recommendation
```

---

## 4. Sensor Channels (the 15 selected as diagnostically valuable, per the
   referenced LiteInception paper's channel-selection study)

```
volt1, volt2, amp1, amp2, E1_FFlow, E1_OilT, E1_OilP,
E1_CHT1, E1_CHT2, E1_CHT3, E1_CHT4,
E1_EGT1, E1_EGT2, E1_EGT3, E1_EGT4
```

---

## 5. Tech Stack

| Layer | Tool |
|---|---|
| Simulation | JSBSim (or Python physics-lite generator) |
| ML models | Python, PyTorch or scikit-learn |
| Backend API | FastAPI (Python) — fast, async-friendly, good for streaming |
| Database | PostgreSQL or SQLite for hackathon scope; InfluxDB if time-series storage preferred |
| LLM integration | Any LLM API (Claude/GPT) via simple REST calls |
| Real-time transport | WebSocket or Server-Sent Events for live/replay streaming |
| Dashboard (frontend, separate from this spec) | Streamlit (fastest) or a small React app with a charting library |

---

## 6. Build Order (priority, for hackathon timeframe)

**Phase 1 — Core pipeline (must-have)**
1. Data Simulator + Fault Injector (2.1, 2.2) — ✅ **already implemented**
2. Stage 1 + Stage 2 models (2.3, 2.4) — train on NGAFID public dataset first, adapt to synthetic data
3. Decision & Alerting Layer with the hard-coded safety rule (2.6)
4. Basic dashboard API exposing live/replay data (2.9, partial)

**Phase 2 — Differentiators (high value, still buildable in time)**
5. Digital Twin residual engine + trend tracking (2.5)
6. LLM report generation (2.7, report part only)
7. Mission-Risk Scorer + What-if mode (2.8) — directly answers the PS title's "Mission Reliability"
8. Black-box replay (2.9, full) — best demo impact for effort spent

**Phase 3 — Stretch (only if time remains)**
9. Copilot chat (2.7, chat part)
10. Feedback loop + accuracy trend (2.10)
11. Federated-learning framing — **describe in the pitch as future architecture only,
    do not build it in code.** (Fleet learning across UAV squadrons without sharing
    classified flight data — genuinely current, defense-relevant 2026 research, but
    out of scope for the hackathon build.)

---

## 7. Config Constants (keep these named and visible, not buried)

```python
AUTO_ACTION_CONFIDENCE_THRESHOLD = 0.90   # below this, alert-only, human decides
UNKNOWN_FAULT_CONFIDENCE_THRESHOLD = 0.60  # below this, output "unknown_pattern"
STAGE1_WINDOW_SECONDS = 90                 # rolling window size for anomaly check
MISSION_RISK_ABORT_THRESHOLD = 40
MISSION_RISK_CAUTION_THRESHOLD = 70
```

---

## 8. Notes on Fidelity to Original Research

- The two-stage cascade, channel selection, and FMEA fault-injection approach directly
  follow the published methodology (verified against the actual papers, not just claimed).
  Key references: Wei et al., "An Intelligent Fault Diagnosis Method for General
  Aviation Aircraft Based on Multi-Fidelity Digital Twin and FMEA Knowledge
  Enhancement" (arXiv:2604.22777); Wei et al., "LiteInception" (arXiv:2604.01725).
- The real-time onboard/ground split (Stage 1 fast + Stage 2 deep) is the part the
  closest published research explicitly has **not** built yet — building even this
  simplified version is the project's strongest differentiator.
- Benchmark dataset for validation/pretraining: NGAFID (National General Aviation
  Flight Information Database), available on Kaggle
  (`hooong/aviation-maintenance-dataset-from-the-ngafid`).

---

## 9. Current Implementation Status Summary

| Module | Status |
|---|---|
| 2.1 Data Simulator | ✅ Implemented (`piston_engine_digital_twin_sim.py`) |
| 2.2 Fault Injector | ✅ Implemented (5 fault types, gradual ramps) |
| 2.3 Stage 1 (anomaly detection) | ❌ Not started |
| 2.4 Stage 2 (fault classification) | ❌ Not started |
| 2.5 Digital Twin residual engine | ❌ Not started |
| 2.6 Decision & Alerting | ❌ Not started |
| 2.7 LLM Report + Copilot | ❌ Not started |
| 2.8 Mission-Risk Scorer | ❌ Not started |
| 2.9 Black-box Recorder + Replay | ❌ Not started |
| 2.10 Feedback loop | ❌ Not started |

**Immediate next step:** Train Stage 1 (binary anomaly classifier) directly on the
CSV output already produced by `piston_engine_digital_twin_sim.py --dataset`.
