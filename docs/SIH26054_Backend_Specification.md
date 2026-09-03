# Backend Specification
## AI-Enabled Real-Time Digital Twin System for Aero Piston Engine Health Monitoring (MALE UAV)
**PS ID:** SIH26054 | **Organization:** DRDO | **Category:** Software | **Theme:** Robotics and Drones

This document is the engineering spec for the backend. It takes the architecture from the original research notes and turns it into buildable modules, APIs, data models, and a build order — 100% software, no hardware required.

---

## 1. System Overview

The backend simulates a MALE UAV piston engine, injects realistic faults into that simulation, detects and classifies those faults in near real-time using a two-stage ML pipeline, explains them in plain language, scores mission risk, and exposes everything through a dashboard-ready API.

Since no real UAV or classified telemetry is available, the "physical layer" of the original 3-layer design is replaced by a **synthetic data generator + fault injector**, which is the standard, citable approach used in the actual published research this project is based on (JSBSim + FMEA-driven fault injection).

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
                                       /          \
                       [LLM Report + Copilot]   [Mission-Risk Scorer]
                                       \          /
                              [Dashboard API + Black-Box Recorder]
                                              v
                                    [Feedback / Self-Correction Loop]
```

---

## 2. Modules

### 2.1 Data Simulator Service
**Purpose:** Generates a realistic flight's worth of engine sensor data, second by second.

- Input: flight duration, throttle/mission profile (simple presets: patrol, high-load climb, cruise)
- Output: time series for the 15 core channels (see Section 4 — sensor channel list)
- Method: JSBSim (open-source 6-DoF flight dynamics engine) driving semi-empirical sensor synthesis equations, OR a lighter pure-Python physics-lite generator if JSBSim integration takes too long
- Runs "ahead of time" for demo data, and can also run "live" (streamed second-by-second) to simulate real-time telemetry

**Endpoint**
```
POST /api/simulate/flight
  body: { duration_minutes, profile, engine_id }
  returns: { flight_id, stream_url }
```

### 2.2 Fault Injection Engine
**Purpose:** Deliberately corrupts the simulated sensor stream to mimic real faults, using FMEA (Failure Mode and Effects Analysis) — the standard, published, citable method for this exact problem when real fault data isn't available.

- Maintains a fault library (start with 5-6 faults, not all 19 — pick ones with clean physical stories):
  1. Oil cooler degradation (slow OilT rise, OilP drop)
  2. Cylinder head overheat (single-cylinder CHT spike)
  3. Exhaust/valve fault (EGT anomaly on one cylinder)
  4. Electrical/alternator fault (amp1/amp2 drift)
  5. Fuel flow irregularity (FF oscillation)
- Each fault has a physical propagation model — the fault doesn't jump straight to "broken," it degrades gradually over the flight, which is what makes it realistic and hard-to-detect (matches real research findings)

**Endpoint**
```
POST /api/simulate/inject-fault
  body: { flight_id, fault_type, onset_time_pct, severity }
  returns: { fault_id, affected_channels }
```

### 2.3 Stage 1 — Onboard/Edge Model (Fast, Lightweight)
**Purpose:** Answers ONE question fast: "normal or not normal?" Optimized to be light enough to represent an onboard/edge deployment (even though it runs as a separate lightweight service here, not on real hardware).

- Binary classifier, tuned for **high recall** (better a false alarm than a missed fault)
- Outputs a confidence score, not just yes/no
- Runs on every incoming data window (rolling window, e.g. last 60-120 seconds)
- Only when it flags "anomalous" does the pipeline call Stage 2 — this saves compute and mirrors real maintenance workflow

**Endpoint**
```
POST /api/stage1/check
  body: { flight_id, window_start, window_end, sensor_data }
  returns: { is_anomalous: bool, confidence: float }
```

### 2.4 Stage 2 — Ground Station Model (Deep Classification)
**Purpose:** Only triggered when Stage 1 flags something. Does fine-grained fault classification.

- Multi-class classifier over the fault library (Section 2.2)
- Outputs: predicted fault type + confidence
- **Unknown-fault handling:** if the top prediction's confidence is below a threshold (e.g. 60%), output `"unknown_pattern"` instead of forcing a guess — flag for manual review
- Includes basic explainability: which sensor channel(s) and which time window contributed most (simple attribution — e.g. gradient-based or "which channel deviated most from expected")

**Endpoint**
```
POST /api/stage2/classify
  body: { flight_id, window_start, window_end, sensor_data }
  returns: {
    fault_type: string | "unknown_pattern",
    confidence: float,
    key_sensors: [string],
    key_time_range: [start, end]
  }
```

### 2.5 Digital Twin / Residual Engine
**Purpose:** The "physics-informed" half of the twin. Keeps a running "expected" value per sensor per flight phase, and computes the gap (residual) between expected and actual.

- Maintains expected-value curves per engine profile (e.g. cruise vs climb baselines)
- Computes residual = |actual - expected| per channel, per timestep
- **Trend tracking:** flags not just single bad readings, but residuals that keep *growing* across the flight (single spikes = noise, growing trend = real degradation)
- Also runs a lightweight **sensor-health check**: distinguishes "sensor itself is faulty" (erratic/impossible readings) from "engine is faulty" (physically plausible but abnormal readings)

**Endpoint**
```
GET /api/twin/residuals?flight_id=xxx
  returns: { channel: [{ t, expected, actual, residual }] }
```

### 2.6 Decision & Alerting Layer
**Purpose:** Converts model outputs into ranked, actionable alerts, and enforces the safety rule for any auto-action.

- Alert severity = f(Stage 1 confidence, Stage 2 confidence, residual trend)
- **Safety rule (hard-coded, not learned):**
  ```
  IF confidence >= AUTO_ACTION_THRESHOLD (e.g. 0.90):
      -> allowed to surface an auto-action recommendation (e.g. "Recommend RTB")
  ELSE:
      -> alert-only, always requires human confirmation
  ```
  This threshold must be a named constant in config, not buried in code — makes it auditable.
- Logs every alert (for the feedback loop, Section 2.9)

**Endpoint**
```
GET /api/alerts?flight_id=xxx
  returns: [{ alert_id, severity, fault_type, confidence, auto_action_eligible, timestamp }]
```

### 2.7 LLM Report + Copilot Service
**Purpose:** Turns raw model output into plain-language explanations, and answers follow-up questions.

- **Report generation:** given a fault classification + key sensors + key time range, calls an LLM API with a structured prompt to produce a 1-2 sentence plain-English explanation (e.g. "Cylinder 2 temperature rising steadily since minute 40, pattern consistent with past oil-cooler faults, recommend inspection before next sortie.")
- **Copilot chat:** a simple chat endpoint scoped to one flight's data — operator can ask "why did you flag this?" or "is it safe to fly tomorrow?" and the LLM answers using the flight's fault/residual data as context (no external knowledge, stay grounded in the actual data)

**Endpoints**
```
POST /api/report/generate
  body: { alert_id }
  returns: { report_text }

POST /api/copilot/chat
  body: { flight_id, message, conversation_history }
  returns: { reply }
```

### 2.8 Mission-Risk Scorer
**Purpose:** Converts engine health into a mission-level decision, not just an engine-level alert — this directly answers "Mission Reliability" in the PS title, not just "health monitoring."

- Simple rule-based scoring (no need for ML here — transparency matters more):
  ```
  health_score = weighted combination of:
      - active alert severities
      - residual trend steepness
      - time-in-flight remaining vs fault trend
  IF health_score < 40:  "Recommend abort / return to base"
  IF 40 <= health_score < 70: "Continue with caution, shorten mission if possible"
  IF health_score >= 70: "Continue mission normally"
  ```
- **"What-if" mode:** given a *planned* mission duration (before takeoff), fast-forwards the current health trend to estimate whether the engine will likely survive the full planned duration, and suggests a safe mission length

**Endpoints**
```
GET /api/mission-risk?flight_id=xxx
  returns: { health_score, recommendation }

POST /api/mission-risk/what-if
  body: { engine_id, planned_duration_minutes }
  returns: { survivable: bool, safe_duration_estimate, recommendation }
```

### 2.9 Black-Box Recorder + Replay
**Purpose:** Stores every flight's full sensor history + every alert raised, and lets any past flight be replayed on the dashboard as if it were happening live (huge for demos).

- Every flight simulated (Section 2.1) is persisted in full
- Replay endpoint streams the stored data back out at adjustable speed (1x, 5x, 20x) so a full flight can be demoed in under a minute

**Endpoint**
```
GET /api/replay/{flight_id}?speed=5x
  returns: streamed sensor + alert events, replayed in time order
```

### 2.10 Feedback / Self-Correction Loop
**Purpose:** Lets the system's accuracy visibly improve over time — a small but effective way to show "real-world AI system" thinking.

- After a flight, operator marks each alert as `true_positive` / `false_positive` / `missed_fault`
- Store this feedback; periodically (or in a demo, on-command) show accuracy trend over the last N flights
- Stretch goal only: actually retrain Stage 1/2 on this feedback. For SIH timeframe, tracking + displaying the trend is enough — don't over-build this part.

**Endpoint**
```
POST /api/feedback
  body: { alert_id, verdict: "true_positive" | "false_positive" | "missed_fault" }

GET /api/feedback/accuracy-trend
  returns: [{ flight_id, accuracy_pct }]
```

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

Sensor channels to track (the 15 selected as diagnostically valuable, per the referenced LiteInception paper's channel-selection study):
`volt1, volt2, amp1, amp2, E1_FFlow, E1_OilT, E1_OilP, E1_CHT1, E1_CHT2, E1_CHT3, E1_CHT4, E1_EGT1, E1_EGT2, E1_EGT3, E1_EGT4`

---

## 4. Tech Stack

| Layer | Tool |
|---|---|
| Simulation | JSBSim (or Python physics-lite generator) |
| ML models | Python, PyTorch or scikit-learn |
| Backend API | FastAPI (Python) — fast, async-friendly, good for streaming |
| Database | PostgreSQL or SQLite for hackathon scope; InfluxDB if time-series storage is preferred |
| LLM integration | Any LLM API (Claude/GPT) via simple REST calls |
| Real-time transport | WebSocket or Server-Sent Events for live/replay streaming to dashboard |
| Dashboard (frontend, separate from this spec) | Streamlit (fastest) or a small React app with a charting library |

---

## 5. Build Order (priority, for hackathon timeframe)

**Phase 1 — Core pipeline (must-have)**
1. Data Simulator + Fault Injector (2.1, 2.2)
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
11. Federated-learning framing (can be described in the pitch as future architecture even if not fully implemented — mention the design, don't over-build it in code)

---

## 6. Config Constants (keep these named and visible, not buried)

```python
AUTO_ACTION_CONFIDENCE_THRESHOLD = 0.90   # below this, alert-only, human decides
UNKNOWN_FAULT_CONFIDENCE_THRESHOLD = 0.60 # below this, output "unknown_pattern"
STAGE1_WINDOW_SECONDS = 90                # rolling window size for anomaly check
MISSION_RISK_ABORT_THRESHOLD = 40
MISSION_RISK_CAUTION_THRESHOLD = 70
```

---

## 7. Notes on Fidelity to the Original Research

- The two-stage cascade, channel selection, and FMEA fault injection approach directly follow the published methodology (verified against the actual papers, not just claimed).
- The real-time onboard/ground split (Stage 1 fast + Stage 2 deep) is the part the closest published research explicitly has **not** built yet — building even this simplified version is the project's strongest differentiator.
- Mission-Risk Scoring and What-if mode are original additions not present in the reference papers — this is what pushes the pitch from "engine health monitoring" to "mission reliability," matching the PS title's actual wording.
