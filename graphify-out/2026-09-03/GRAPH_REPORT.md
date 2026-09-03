# Graph Report - SIH  (2026-09-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 385 nodes · 574 edges · 23 communities (12 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- inject_fault
- telemetry.ts
- test_twin_and_services.py
- devDependencies
- schemas.py
- generate_flight
- main.py
- compilerOptions
- dependencies
- compilerOptions
- FlightData
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
8. `Stage1Detector` - 10 edges
9. `DigitalTwinResidualEngine` - 10 edges
10. `Stage2Classifier` - 10 edges

## Surprising Connections (you probably didn't know these)
- `inject_fault()` --uses--> `FlightData`  [INFERRED]
  backend/simulator/fault_injector.py → backend/simulator/engine_simulator.py
- `MissionRiskScorer` --uses--> `MissionRiskResponse`  [INFERRED]
  backend/services/mission_risk.py → backend/schemas.py
- `MissionRiskScorer` --uses--> `WhatIfResponse`  [INFERRED]
  backend/services/mission_risk.py → backend/schemas.py
- `plugins` --extends--> `typescript`  [EXTRACTED]
  .oxlintrc.json → package.json
- `DigitalTwinResidualEngine` --uses--> `FlightData`  [INFERRED]
  backend/twin/residual_engine.py → backend/simulator/engine_simulator.py

## Import Cycles
- None detected.

## Communities (23 total, 9 thin omitted)

### Community 0 - "inject_fault"
Cohesion: 0.06
Nodes (38): SIH26054 — Auditable Configuration Constants AI-Enabled Real-Time Digital Twin…, extract_window_features(), ndarray, SIH26054 — Feature Extraction Utilities Extracts statistical features from…, Compute normalized spectral entropy of a 1D signal., Linear regression slope over the window., Extract 90-dimensional feature vector from a window [start_idx:end_idx].…, _slope() (+30 more)

### Community 1 - "telemetry.ts"
Cohesion: 0.07
Nodes (31): react, App(), OverlayHUD(), OverlayHUDProps, CylinderProps, PALETTES, Scene3D(), SceneConfig (+23 more)

### Community 2 - "test_twin_and_services.py"
Cohesion: 0.09
Nodes (25): AlertItem, AlertSeverity, DecisionAlertingEngine, AlertItem, SIH26054 — Decision & Alerting Layer Converts Stage 1 & Stage 2 model outputs…, Decision logic and safety threshold enforcement., Evaluate inputs and return a structured, ranked AlertItem., LLMCopilotService (+17 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (35): oxlint, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, devDependencies, oxlint (+27 more)

### Community 4 - "schemas.py"
Cohesion: 0.11
Nodes (30): AccuracyTrendPoint, CopilotChatRequest, CopilotChatResponse, FaultInjectionRequest, FaultInjectionResponse, FaultType, FeedbackRequest, FeedbackVerdict (+22 more)

### Community 5 - "generate_flight"
Cohesion: 0.08
Nodes (20): Bi-directional streaming WebSocket for live 3D Digital Twin visualization.…, websocket_telemetry_stream(), generate_flight(), Generate a full flight's telemetry for all 15 sensor channels. The physics…, climb_flight(), cruise_flight(), patrol_flight(), fixture (+12 more)

### Community 6 - "main.py"
Cohesion: 0.10
Nodes (24): copilot_chat(), generate_report_endpoint(), get_accuracy_trend(), get_alerts(), get_mission_risk(), get_residuals(), health_check(), inject_fault_endpoint() (+16 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 8 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, dependencies, clsx, framer-motion, lucide-react, react (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 10 - "FlightData"
Cohesion: 0.14
Nodes (10): FlightData, Path, Container for a generated flight's telemetry., Write flight data to CSV. Returns the file path., TestDigitalTwinResidualEngine, DigitalTwinResidualEngine, ndarray, Compute residuals |actual - expected| and trend metrics for each channel. (+2 more)

### Community 11 - "Stage2Classifier"
Cohesion: 0.16
Nodes (9): ndarray, Path, Predict fault type from a 90-dim feature vector. Returns dict with fault_type,…, Get the top contributing sensor channels from feature importance., Persist model to disk., Load model from disk., Multi-class fault classifier for ground station deployment., Train on labeled Stage 2 CSV (columns: 90 features + label [fault_type string]). (+1 more)

## Knowledge Gaps
- **85 isolated node(s):** `CylinderProps`, `AlertItem`, `AlertSeverity`, `FaultInjectionRequest`, `FaultInjectionResponse` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 192 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Stage2Classifier` connect `Stage2Classifier` to `inject_fault`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `CylinderProps`, `AlertItem`, `AlertSeverity` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `inject_fault` be split into smaller, more focused modules?**
  _Cohesion score 0.05878084179970972 - nodes in this community are weakly interconnected._
- **Should `telemetry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._
- **Should `test_twin_and_services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0858974358974359 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `schemas.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10984848484848485 - nodes in this community are weakly interconnected._