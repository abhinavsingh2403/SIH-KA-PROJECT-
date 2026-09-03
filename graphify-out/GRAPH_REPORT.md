# Graph Report - SIH  (2026-09-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 446 nodes · 683 edges · 28 communities (18 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- schemas.py
- telemetry.ts
- Stage1Detector
- main.py
- devDependencies
- MAVLinkTelemetryParser
- compilerOptions
- FlightData
- dependencies
- compilerOptions
- test_twin_and_services.py
- config.py
- generate_flight
- features.py
- DecisionAlertingEngine
- run_ood_validation
- TestChannelCompleteness
- websocket_telemetry_stream
- build_flight_dataset
- tsconfig.json
- backend/__init__.py
- models/__init__.py
- services/__init__.py
- simulator/__init__.py
- tests/__init__.py
- twin/__init__.py

## God Nodes (most connected - your core abstractions)
1. `generate_flight()` - 18 edges
2. `compilerOptions` - 18 edges
3. `inject_fault()` - 17 edges
4. `compilerOptions` - 15 edges
5. `AlertItem` - 14 edges
6. `MissionRiskScorer` - 14 edges
7. `FlightData` - 12 edges
8. `extract_window_features()` - 11 edges
9. `AlertSeverity` - 10 edges
10. `Stage1Detector` - 10 edges

## Surprising Connections (you probably didn't know these)
- `DecisionAlertingEngine` --uses--> `AlertItem`  [INFERRED]
  backend/services/alerting.py → backend/schemas.py
- `DecisionAlertingEngine` --uses--> `AlertSeverity`  [INFERRED]
  backend/services/alerting.py → backend/schemas.py
- `inject_fault()` --uses--> `FlightData`  [INFERRED]
  backend/simulator/fault_injector.py → backend/simulator/engine_simulator.py
- `plugins` --extends--> `typescript`  [EXTRACTED]
  .oxlintrc.json → package.json
- `get_accuracy_trend()` --calls--> `AccuracyTrendPoint`  [EXTRACTED]
  backend/main.py → backend/schemas.py

## Import Cycles
- None detected.

## Communities (28 total, 8 thin omitted)

### Community 0 - "schemas.py"
Cohesion: 0.06
Nodes (46): AccuracyTrendPoint, AlertItem, AlertSeverity, CopilotChatRequest, CopilotChatResponse, FaultInjectionRequest, FaultInjectionResponse, FaultType (+38 more)

### Community 1 - "telemetry.ts"
Cohesion: 0.07
Nodes (35): react, App(), Dashboard(), DashboardProps, OverlayHUDProps, CylinderProps, PALETTES, Scene3D() (+27 more)

### Community 2 - "Stage1Detector"
Cohesion: 0.07
Nodes (24): ndarray, Path, SIH26054 — Stage 1: Edge Anomaly Detector Lightweight binary classifier…, Predict on a single 90-dim feature vector. Returns (is_anomalous, confidence)., Persist model to disk., Load model from disk., Load CSV into numpy array (skip header, all numeric)., Binary anomaly detector for onboard/edge deployment. (+16 more)

### Community 3 - "main.py"
Cohesion: 0.08
Nodes (32): copilot_chat(), generate_report_endpoint(), get_accuracy_trend(), get_alerts(), get_fleet_federated_status(), get_mission_risk(), get_residuals(), health_check() (+24 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (35): oxlint, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, devDependencies, oxlint (+27 more)

### Community 5 - "MAVLinkTelemetryParser"
Cohesion: 0.07
Nodes (21): FleetFederatedAggregator, Any, ndarray, Executes one full Federated Learning communication round: 1. Each UAV edge…, Represents an edge onboard computer on a single MALE UAV., Simulates flying a local sortie and extracting 90-second feature windows., Trains locally for one epoch and returns model weights (never raw data)., Updates local onboard model with aggregated global weights. (+13 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 7 - "FlightData"
Cohesion: 0.12
Nodes (13): FlightData, _interpolate_throttle(), Path, Container for a generated flight's telemetry., Write flight data to CSV. Returns the file path., Interpolate throttle percentage from flight profile at time fraction t_frac ∈…, TestDigitalTwinResidualEngine, DigitalTwinResidualEngine (+5 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, dependencies, clsx, framer-motion, lucide-react, react (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 10 - "test_twin_and_services.py"
Cohesion: 0.17
Nodes (11): inject_fault(), Inject a fault into a copy of the flight data. Returns (modified_data,…, Verify gradual degradation: max derivative should be bounded., Verify per-cylinder fault only affects the targeted cylinder., Data before the fault onset time should be nearly identical., TestFaultInjection, clean_flight(), faulted_flight() (+3 more)

### Community 11 - "config.py"
Cohesion: 0.20
Nodes (9): SIH26054 — Auditable Configuration Constants AI-Enabled Real-Time Digital Twin…, SIH26054 — Federated Learning Fleet Framing & Model Aggregator Simulates a…, SIH26054 — Out-of-Distribution (OOD) & Anti-Leakage Validation Engine…, SIH26054 — Training Dataset Generator Generates labeled windowed feature…, SIH26054 — Semi-Empirical Aero Piston Engine Simulator Generates realistic…, ndarray, SIH26054 — FMEA Fault Injector Applies gradual, physically-motivated…, Generate a smooth sigmoid degradation ramp. Returns values in [0, severity] — 0… (+1 more)

### Community 12 - "generate_flight"
Cohesion: 0.20
Nodes (11): generate_flight(), Generate a full flight's telemetry for all 15 sensor channels. The physics…, climb_flight(), cruise_flight(), patrol_flight(), fixture, SIH26054 — Unit Tests for Engine Simulator & Fault Injector Validates: 1. All…, Verify that clean flight data stays within physically plausible bounds. We… (+3 more)

### Community 13 - "features.py"
Cohesion: 0.23
Nodes (11): extract_window_features(), ndarray, SIH26054 — Feature Extraction Utilities Extracts statistical features from…, Compute normalized spectral entropy of a 1D signal., Linear regression slope over the window., Extract 90-dimensional feature vector from a window [start_idx:end_idx].…, _slope(), _spectral_entropy() (+3 more)

### Community 14 - "DecisionAlertingEngine"
Cohesion: 0.29
Nodes (5): DecisionAlertingEngine, AlertItem, Decision logic and safety threshold enforcement., Evaluate inputs and return a structured, ranked AlertItem., TestDecisionAlertingEngine

### Community 15 - "run_ood_validation"
Cohesion: 0.40
Nodes (5): Runs Leave-Flight-Out validation and Out-of-Distribution testing., run_ood_validation(), SIH26054 — Automated Anti-Leakage & OOD Verification Test Ensures: 1. Models…, Verify that OOD generalization aligns with published literature (F1 >= 0.75)., test_out_of_distribution_generalization()

### Community 17 - "websocket_telemetry_stream"
Cohesion: 0.67
Nodes (3): Bi-directional streaming WebSocket for live 3D Digital Twin visualization.…, websocket_telemetry_stream(), websocket

### Community 18 - "build_flight_dataset"
Cohesion: 0.67
Nodes (3): build_flight_dataset(), ndarray, Builds a windowed dataset with explicit flight_id tracking to prevent data…

## Knowledge Gaps
- **87 isolated node(s):** `CylinderProps`, `SeriesConfig`, `TelemetryChartsProps`, `AlertItem`, `AlertSeverity` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `inject_fault()` connect `test_twin_and_services.py` to `Stage1Detector`, `main.py`, `MAVLinkTelemetryParser`, `FlightData`, `config.py`, `generate_flight`, `websocket_telemetry_stream`, `build_flight_dataset`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `CylinderProps`, `SeriesConfig`, `TelemetryChartsProps` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schemas.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06327683615819209 - nodes in this community are weakly interconnected._
- **Should `telemetry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06509803921568627 - nodes in this community are weakly interconnected._
- **Should `Stage1Detector` be split into smaller, more focused modules?**
  _Cohesion score 0.06882591093117409 - nodes in this community are weakly interconnected._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07539118065433854 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._