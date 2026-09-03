# Graph Report - SIH  (2026-09-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 370 nodes · 584 edges · 23 communities (13 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- main.py
- generate_flight
- test_twin_and_services.py
- devDependencies
- inject_fault
- compilerOptions
- dependencies
- compilerOptions
- Scene3D.tsx
- telemetry.ts
- Stage2Classifier
- Stage1Detector
- features.py
- test_api_endpoints.py
- tsconfig.json
- backend/__init__.py
- models/__init__.py
- services/__init__.py
- simulator/__init__.py
- tests/__init__.py
- twin/__init__.py

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `generate_flight()` - 16 edges
3. `AlertItem` - 15 edges
4. `MissionRiskScorer` - 15 edges
5. `inject_fault()` - 15 edges
6. `compilerOptions` - 15 edges
7. `FlightData` - 13 edges
8. `DigitalTwinResidualEngine` - 11 edges
9. `Stage2Classifier` - 11 edges
10. `Stage1Detector` - 11 edges

## Surprising Connections (you probably didn't know these)
- `inject_fault()` --uses--> `FlightData`  [INFERRED]
  backend/simulator/fault_injector.py → backend/simulator/engine_simulator.py
- `generate_report_endpoint()` --uses--> `AlertItem`  [INFERRED]
  backend/main.py → backend/schemas.py
- `plugins` --extends--> `typescript`  [EXTRACTED]
  .oxlintrc.json → package.json
- `get_accuracy_trend()` --uses--> `AccuracyTrendPoint`  [INFERRED]
  backend/main.py → backend/schemas.py
- `copilot_chat()` --uses--> `CopilotChatRequest`  [INFERRED]
  backend/main.py → backend/schemas.py

## Import Cycles
- None detected.

## Communities (23 total, 8 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.10
Nodes (47): copilot_chat(), generate_report_endpoint(), get_accuracy_trend(), get_alerts(), get_mission_risk(), get_residuals(), health_check(), inject_fault_endpoint() (+39 more)

### Community 1 - "generate_flight"
Cohesion: 0.06
Nodes (28): SIH26054 — Auditable Configuration Constants AI-Enabled Real-Time Digital Twin…, FlightData, generate_flight(), _interpolate_throttle(), Path, SIH26054 — Semi-Empirical Aero Piston Engine Simulator Generates realistic…, Container for a generated flight's telemetry., Write flight data to CSV. Returns the file path. (+20 more)

### Community 2 - "test_twin_and_services.py"
Cohesion: 0.08
Nodes (29): AlertItem, AlertSeverity, MissionRiskResponse, WhatIfResponse, DecisionAlertingEngine, AlertItem, SIH26054 — Decision & Alerting Layer Converts Stage 1 & Stage 2 model outputs…, Decision logic and safety threshold enforcement. (+21 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (35): oxlint, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, devDependencies, oxlint (+27 more)

### Community 4 - "inject_fault"
Cohesion: 0.11
Nodes (18): _extract_all_windows(), generate_dataset(), ndarray, SIH26054 — Training Dataset Generator Generates labeled windowed feature…, Extract all rolling windows from a flight., Generate training CSVs for Stage 1 and Stage 2., main(), SIH26054 — End-to-End Training Pipeline 1. Generate training datasets (or load… (+10 more)

### Community 5 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 6 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, dependencies, clsx, framer-motion, lucide-react, react (+13 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 8 - "Scene3D.tsx"
Cohesion: 0.16
Nodes (12): react, App(), OverlayHUD(), OverlayHUDProps, CylinderProps, PALETTES, Scene3D(), SceneConfig (+4 more)

### Community 9 - "telemetry.ts"
Cohesion: 0.11
Nodes (17): AlertItem, AlertSeverity, FaultInjectionRequest, FaultInjectionResponse, FaultType, FeedbackVerdict, FlightProfile, FlightSimulationRequest (+9 more)

### Community 10 - "Stage2Classifier"
Cohesion: 0.14
Nodes (10): ndarray, Path, SIH26054 — Stage 2: Ground Fault Classifier Multi-class classifier for fine-…, Predict fault type from a 90-dim feature vector. Returns dict with fault_type,…, Get the top contributing sensor channels from feature importance., Persist model to disk., Load model from disk., Multi-class fault classifier for ground station deployment. (+2 more)

### Community 11 - "Stage1Detector"
Cohesion: 0.18
Nodes (9): ndarray, Path, Predict on a single 90-dim feature vector. Returns (is_anomalous, confidence)., Persist model to disk., Load model from disk., Load CSV into numpy array (skip header, all numeric)., Binary anomaly detector for onboard/edge deployment., Train on labeled Stage 1 CSV (columns: 90 features + label [0/1]). (+1 more)

### Community 12 - "features.py"
Cohesion: 0.25
Nodes (7): ndarray, SIH26054 — Feature Extraction Utilities Extracts statistical features from…, Compute normalized spectral entropy of a 1D signal., Linear regression slope over the window., _slope(), _spectral_entropy(), SIH26054 — Stage 1: Edge Anomaly Detector Lightweight binary classifier…

## Knowledge Gaps
- **86 isolated node(s):** `CylinderProps`, `AlertItem`, `AlertSeverity`, `FaultInjectionRequest`, `FaultInjectionResponse` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 184 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Stage2Classifier` connect `Stage2Classifier` to `main.py`, `inject_fault`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Stage1Detector` connect `Stage1Detector` to `main.py`, `features.py`, `inject_fault`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `inject_fault()` connect `inject_fault` to `main.py`, `generate_flight`, `test_twin_and_services.py`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `AlertItem` (e.g. with `generate_report_endpoint()` and `DecisionAlertingEngine`) actually correct?**
  _`AlertItem` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `MissionRiskScorer` (e.g. with `AlertItem` and `AlertSeverity`) actually correct?**
  _`MissionRiskScorer` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CylinderProps`, `AlertItem`, `AlertSeverity` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09948979591836735 - nodes in this community are weakly interconnected._