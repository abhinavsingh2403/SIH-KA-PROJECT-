# SIH26054 — Opus / Agent Development Roadmap

This document is the **single source of truth** for any coding agent (Claude Opus,
Gemini, or human developer) picking up this project. It contains exact build
instructions, math formulas, schema references, and verification commands for
every module in the SIH26054 pipeline.

**Pre-condition:** The foundation layer is complete — `backend/config.py`,
`backend/schemas.py`, `backend/simulator/engine_simulator.py`,
`backend/simulator/fault_injector.py`, `backend/main.py`, and
`src/types/telemetry.ts` are all implemented and tested (16/16 pytest pass).

---

## Project Structure

```
SIH/
├── backend/
│   ├── __init__.py
│   ├── config.py              # Auditable constants, sensor defs, nominal bands
│   ├── schemas.py             # Pydantic v2 request/response contracts
│   ├── main.py                # FastAPI app (simulation + replay endpoints)
│   ├── requirements.txt
│   ├── simulator/
│   │   ├── __init__.py
│   │   ├── engine_simulator.py  # 15-channel physics engine (✅ tested)
│   │   └── fault_injector.py    # 5 FMEA fault models (✅ tested)
│   ├── models/                  # [TO BUILD] ML models for Stage 1 & 2
│   │   ├── stage1_detector.py
│   │   └── stage2_classifier.py
│   ├── twin/                    # [TO BUILD] Digital Twin residual engine
│   │   └── residual_engine.py
│   ├── services/                # [TO BUILD] Alerting, risk scorer, LLM
│   │   ├── alerting.py
│   │   ├── mission_risk.py
│   │   └── llm_copilot.py
│   └── tests/
│       ├── __init__.py
│       └── test_simulator.py    # 16 tests (✅ all passing)
├── data/                        # Generated flight CSVs
├── docs/                        # DRDO spec MDs
├── src/                         # React 19 + TypeScript frontend
│   ├── components/
│   │   ├── Scene3D.tsx          # 3D engine digital twin (R3F)
│   │   └── OverlayHUD.tsx       # Glassmorphic HUD overlay
│   ├── lib/
│   │   ├── utils.ts             # cn() helper
│   │   └── motion.ts            # Framer Motion variants
│   └── types/
│       └── telemetry.ts         # TypeScript interfaces matching backend schemas
├── package.json
├── vite.config.ts
├── OPUS_ROADMAP.md              # THIS FILE
└── SIH26054_PROJECT_BRIEF.md    # Original problem specification
```

---

## Build Order (execute in this order)

### ✅ DONE — Phase 0: Foundation
- [x] `config.py`: 15 sensor channels, nominal bands, 5 fault types, flight profiles
- [x] `schemas.py`: Full Pydantic v2 contracts for all 10 modules
- [x] `engine_simulator.py`: Throttle → RPM → CHT/EGT/Oil/Fuel/Electrical with thermal inertia
- [x] `fault_injector.py`: Sigmoid ramp degradation, per-cylinder targeting, cross-contamination
- [x] `main.py`: FastAPI with `/simulate/flight`, `/simulate/inject-fault`, `/replay`
- [x] `telemetry.ts`: TypeScript interfaces, thermal ranges, thermalIntensity utility
- [x] 16/16 pytest passing

### Phase 1: Generate Training Data
**Goal:** Create labeled CSV datasets for Stage 1 and Stage 2 model training.

```python
# Script: backend/scripts/generate_dataset.py
# For each profile (patrol, climb, cruise):
#   1. Generate 50 clean flights (label: "normal")
#   2. Generate 50 faulted flights per fault type × 3 severity levels (0.3, 0.6, 0.9)
#      → 50 × 5 faults × 3 severities = 750 faulted flights
#   3. Total: ~800 flights × 3 profiles = ~2,400 flights
#   4. Each flight → windowed samples (90s rolling window, 30s stride)
#   5. Output: data/training_stage1.csv (binary: normal vs anomalous)
#              data/training_stage2.csv (multi-class: 5 fault types + normal)
```

**Feature extraction per window (15 channels × 6 features = 90 features):**
- Mean, std, min, max, slope (linear regression), spectral entropy

**Verification:**
```powershell
python -m pytest backend/tests/test_dataset.py -v
```

### Phase 2: Stage 1 — Edge Anomaly Detector
**Goal:** Binary classifier answering "normal or not normal?" with high recall.

**File:** `backend/models/stage1_detector.py`

**Architecture:** Isolation Forest or lightweight 1D-CNN
- Input: 90 features (15 channels × 6 statistical features per 90s window)
- Output: `{ is_anomalous: bool, confidence: float }`
- Optimization target: **recall ≥ 0.95** (false negatives are dangerous)
- Threshold: tuned on validation set to maximize F2-score (recall-weighted)

**API Integration:**
```python
# In main.py, add:
@app.post("/api/stage1/check", response_model=Stage1CheckResponse)
def stage1_check(req: Stage1CheckRequest):
    features = extract_features(req.sensor_data, window_seconds=90)
    result = stage1_model.predict(features)
    return Stage1CheckResponse(is_anomalous=result.label, confidence=result.score)
```

**Verification:**
```powershell
python -m pytest backend/tests/test_stage1.py -v
# Expected: recall ≥ 0.95 on holdout set
```

### Phase 3: Stage 2 — Ground Fault Classifier
**Goal:** Multi-class fault classification, only triggered when Stage 1 flags anomaly.

**File:** `backend/models/stage2_classifier.py`

**Architecture:** Random Forest or 1D-CNN (6 classes: 5 faults + unknown_pattern)
- Input: same 90-feature vector
- Output: `{ fault_type, confidence, key_sensors, key_time_range }`
- **Unknown-fault rule:** if top confidence < `UNKNOWN_FAULT_CONFIDENCE_THRESHOLD` (0.60),
  return `"unknown_pattern"`
- **Explainability:** feature importance → map back to channel names → `key_sensors`

**Verification:**
```powershell
python -m pytest backend/tests/test_stage2.py -v
# Expected: accuracy ≥ 0.85 on holdout, unknown_pattern triggered correctly
```

### Phase 4: Digital Twin Residual Engine
**Goal:** Track expected vs actual sensor values per channel, flag growing trends.

**File:** `backend/twin/residual_engine.py`

**Formulas:**
```
expected[ch][t] = baseline_curve(profile, throttle_at_t, ch)
residual[ch][t] = |actual[ch][t] - expected[ch][t]|
trend_slope[ch] = linear_regression_slope(residual[ch][last_120s])

IF trend_slope > TREND_THRESHOLD → flag as "degrading"
IF residual > 3 × nominal_noise_std → flag as "anomalous reading"
IF reading physically impossible (e.g. CHT < 0) → flag as "sensor fault"
```

**API:**
```python
@app.get("/api/twin/residuals")
def get_residuals(flight_id: str):
    # Returns per-channel residual time series
```

### Phase 5: Decision & Alerting Layer
**File:** `backend/services/alerting.py`

**Alert severity formula:**
```
severity_score = 0.3 × stage1_confidence
               + 0.4 × stage2_confidence
               + 0.3 × trend_slope_normalized

IF severity_score ≥ 0.8 → "critical"
IF severity_score ≥ 0.5 → "warning"
ELSE → "info"

auto_action_eligible = (stage2_confidence ≥ AUTO_ACTION_CONFIDENCE_THRESHOLD)
```

### Phase 6: Mission-Risk Scorer
**File:** `backend/services/mission_risk.py`

**Health score (0–100):**
```
base_score = 100
FOR each active alert:
    IF critical: base_score -= 30
    IF warning:  base_score -= 15
    IF info:     base_score -= 5
Adjust for trend: base_score -= trend_slope_avg × 10
Clamp to [0, 100]

IF health_score < 40:  "Recommend abort / return to base"
IF 40 ≤ health_score < 70: "Continue with caution, shorten mission"
IF health_score ≥ 70: "Continue mission normally"
```

**What-if mode:**
```
Extrapolate current trend_slope forward by planned_duration_minutes.
Estimate when health_score would drop below ABORT threshold.
safe_duration = time until health_score hits 40.
```

### Phase 7: LLM Report Generation
**File:** `backend/services/llm_copilot.py`

**Structured prompt template:**
```
You are an aviation maintenance AI. Given this fault data:
- Fault type: {fault_type}
- Confidence: {confidence}%
- Affected sensors: {key_sensors}
- Time range: {start}s to {end}s
- Residual trend: {trend_description}

Write a 1-2 sentence plain-English explanation for a UAV operator.
Focus on: what's happening, which component, and recommended action.
```

### Phase 8: 3D Digital Twin Frontend
**Update:** `src/components/Scene3D.tsx`

Replace the generic quantum sphere with a 4-cylinder boxer engine:
- 4 cylinder meshes in horizontally-opposed layout
- Real-time color mapping: CHT1-4 → cylinder heat (green → amber → red)
- Oil cooler mesh with pressure-based pulsing
- Alternator/generator with voltage-based glow
- Interactive: click cylinder → show that channel's telemetry

**Data flow:**
```
FastAPI WebSocket /api/ws/telemetry
  → React useEffect subscription
  → Update zustand store
  → Scene3D reads from store in useFrame()
  → Per-cylinder material.color.lerp(heatColor, delta)
```

---

## Verification Commands

```powershell
# Backend tests
python -m pytest backend/tests -v

# Frontend build
npm run build

# Start backend
python -m uvicorn backend.main:app --reload --port 8000

# Start frontend
npm run dev

# Graphify AST update (after code changes)
graphify update . --code-only
```

---

## Config Constants Reference

| Constant | Value | Purpose |
|---|---|---|
| `AUTO_ACTION_CONFIDENCE_THRESHOLD` | 0.90 | ≥ this → auto-action eligible |
| `UNKNOWN_FAULT_CONFIDENCE_THRESHOLD` | 0.60 | < this → "unknown_pattern" |
| `STAGE1_WINDOW_SECONDS` | 90 | Rolling anomaly detection window |
| `MISSION_RISK_ABORT_THRESHOLD` | 40 | < 40 → Recommend abort/RTB |
| `MISSION_RISK_CAUTION_THRESHOLD` | 70 | 40-70 → Continue with caution |

---

## Key Research Citations

1. Wei et al., "An Intelligent Fault Diagnosis Method for General Aviation Aircraft
   Based on Multi-Fidelity Digital Twin and FMEA Knowledge Enhancement" (arXiv:2604.22777)
2. Wei et al., "LiteInception" (arXiv:2604.01725) — channel selection study
3. NGAFID dataset: `hooong/aviation-maintenance-dataset-from-the-ngafid` (Kaggle)
