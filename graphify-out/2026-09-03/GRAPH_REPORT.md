# Graph Report - SIH  (2026-09-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 393 nodes · 593 edges · 23 communities (12 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- telemetry.ts
- test_twin_and_services.py
- generate_flight
- inject_fault
- devDependencies
- main.py
- schemas.py
- compilerOptions
- dependencies
- compilerOptions
- Stage1Detector
- Stage2Classifier
- tsconfig.json
- backend/__init__.py
- models/__init__.py
- services/__init__.py
- simulator/__init__.py
- tests/__init__.py
- twin/__init__.py
- FaultInjectionRequest
- FlightSimulationRequest

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `generate_flight()` - 16 edges
3. `inject_fault()` - 15 edges
4. `compilerOptions` - 15 edges
5. `AlertItem` - 14 edges
6. `MissionRiskScorer` - 14 edges
7. `FlightData` - 12 edges
8. `AlertSeverity` - 10 edges
9. `Stage1Detector` - 10 edges
10. `Stage2Classifier` - 10 edges

## Surprising Connections (you probably didn't know these)
- `MissionRiskScorer` --uses--> `MissionRiskResponse`  [INFERRED]
  backend/services/mission_risk.py → backend/schemas.py
- `MissionRiskScorer` --uses--> `WhatIfResponse`  [INFERRED]
  backend/services/mission_risk.py → backend/schemas.py
- `inject_fault()` --uses--> `FlightData`  [INFERRED]
  backend/simulator/fault_injector.py → backend/simulator/engine_simulator.py
- `plugins` --extends--> `typescript`  [EXTRACTED]
  .oxlintrc.json → package.json
- `DashboardProps` --references--> `SceneConfig`  [EXTRACTED]
  src/components/Dashboard.tsx → src/components/Scene3D.tsx

## Import Cycles
- None detected.

## Communities (23 total, 9 thin omitted)

### Community 0 - "telemetry.ts"
Cohesion: 0.07
Nodes (35): react, App(), Dashboard(), DashboardProps, OverlayHUDProps, CylinderProps, PALETTES, Scene3D() (+27 more)

### Community 1 - "test_twin_and_services.py"
Cohesion: 0.08
Nodes (27): SIH26054 — Auditable Configuration Constants AI-Enabled Real-Time Digital Twin…, AlertItem, AlertSeverity, DecisionAlertingEngine, AlertItem, SIH26054 — Decision & Alerting Layer Converts Stage 1 & Stage 2 model outputs…, Decision logic and safety threshold enforcement., Evaluate inputs and return a structured, ranked AlertItem. (+19 more)

### Community 2 - "generate_flight"
Cohesion: 0.07
Nodes (26): FlightData, generate_flight(), _interpolate_throttle(), Path, SIH26054 — Semi-Empirical Aero Piston Engine Simulator Generates realistic…, Container for a generated flight's telemetry., Write flight data to CSV. Returns the file path., Interpolate throttle percentage from flight profile at time fraction t_frac ∈… (+18 more)

### Community 3 - "inject_fault"
Cohesion: 0.07
Nodes (29): extract_window_features(), ndarray, SIH26054 — Feature Extraction Utilities Extracts statistical features from…, Compute normalized spectral entropy of a 1D signal., Linear regression slope over the window., Extract 90-dimensional feature vector from a window [start_idx:end_idx].…, _slope(), _spectral_entropy() (+21 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (35): oxlint, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, devDependencies, oxlint (+27 more)

### Community 5 - "main.py"
Cohesion: 0.09
Nodes (27): copilot_chat(), generate_report_endpoint(), get_accuracy_trend(), get_alerts(), get_mission_risk(), get_residuals(), health_check(), inject_fault_endpoint() (+19 more)

### Community 6 - "schemas.py"
Cohesion: 0.12
Nodes (29): AccuracyTrendPoint, CopilotChatRequest, CopilotChatResponse, FaultInjectionRequest, FaultInjectionResponse, FaultType, FeedbackRequest, FeedbackVerdict (+21 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, dependencies, clsx, framer-motion, lucide-react, react (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 10 - "Stage1Detector"
Cohesion: 0.18
Nodes (9): ndarray, Path, Predict on a single 90-dim feature vector. Returns (is_anomalous, confidence)., Persist model to disk., Load model from disk., Load CSV into numpy array (skip header, all numeric)., Binary anomaly detector for onboard/edge deployment., Train on labeled Stage 1 CSV (columns: 90 features + label [0/1]). (+1 more)

### Community 11 - "Stage2Classifier"
Cohesion: 0.16
Nodes (9): ndarray, Path, Predict fault type from a 90-dim feature vector. Returns dict with fault_type,…, Get the top contributing sensor channels from feature importance., Persist model to disk., Load model from disk., Multi-class fault classifier for ground station deployment., Train on labeled Stage 2 CSV (columns: 90 features + label [fault_type string]). (+1 more)

## Knowledge Gaps
- **87 isolated node(s):** `AlertItem`, `AlertSeverity`, `FaultInjectionRequest`, `FaultInjectionResponse`, `FaultType` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 196 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `plugins` connect `devDependencies` to `telemetry.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Stage2Classifier` connect `Stage2Classifier` to `inject_fault`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `AlertItem`, `AlertSeverity`, `FaultInjectionRequest` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `telemetry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06509803921568627 - nodes in this community are weakly interconnected._
- **Should `test_twin_and_services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.080338266384778 - nodes in this community are weakly interconnected._
- **Should `generate_flight` be split into smaller, more focused modules?**
  _Cohesion score 0.06755260243632337 - nodes in this community are weakly interconnected._
- **Should `inject_fault` be split into smaller, more focused modules?**
  _Cohesion score 0.07422402159244265 - nodes in this community are weakly interconnected._