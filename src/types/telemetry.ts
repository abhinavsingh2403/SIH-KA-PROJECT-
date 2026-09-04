/**
 * SIH26054 — Telemetry Type Definitions
 * TypeScript interfaces matching the backend Pydantic schemas for the
 * 15-channel MALE UAV aero piston engine digital twin.
 */

// ─── Sensor Channel Names ───────────────────────────────────────────────────────

export const SENSOR_CHANNELS = [
  "volt1", "volt2", "amp1", "amp2",
  "E1_FFlow",
  "E1_OilT", "E1_OilP",
  "E1_CHT1", "E1_CHT2", "E1_CHT3", "E1_CHT4",
  "E1_EGT1", "E1_EGT2", "E1_EGT3", "E1_EGT4",
] as const;

export type SensorChannel = (typeof SENSOR_CHANNELS)[number];

// ─── Enums ──────────────────────────────────────────────────────────────────────

export type FlightProfile = "patrol" | "climb" | "cruise";

export type FaultType =
  | "oil_cooler_degradation"
  | "cylinder_head_overheat"
  | "exhaust_valve_leak"
  | "alternator_rectifier_drift"
  | "fuel_flow_oscillation";

export type AlertSeverity = "info" | "warning" | "critical";

export type FeedbackVerdict = "true_positive" | "false_positive" | "missed_fault";

// ─── Sensor Reading ─────────────────────────────────────────────────────────────

export interface SensorReading {
  timestamp: number;
  volt1: number;
  volt2: number;
  amp1: number;
  amp2: number;
  E1_FFlow: number;
  E1_OilT: number;
  E1_OilP: number;
  E1_CHT1: number;
  E1_CHT2: number;
  E1_CHT3: number;
  E1_CHT4: number;
  E1_EGT1: number;
  E1_EGT2: number;
  E1_EGT3: number;
  E1_EGT4: number;
}

// ─── API Requests & Responses ───────────────────────────────────────────────────

export interface FlightSimulationRequest {
  duration_minutes: number;
  profile: FlightProfile;
  engine_id: string;
}

export interface FlightSimulationResponse {
  flight_id: string;
  engine_id: string;
  duration_seconds: number;
  profile: FlightProfile;
  num_channels: number;
  num_samples: number;
  data_path: string;
}

export interface FaultInjectionRequest {
  flight_id: string;
  fault_type: FaultType;
  onset_time_pct: number;
  severity: number;
  target_cylinder?: 1 | 2 | 3 | 4;
}

export interface FaultInjectionResponse {
  fault_id: string;
  flight_id: string;
  fault_type: FaultType;
  onset_time_pct: number;
  severity: number;
  affected_channels: SensorChannel[];
  target_cylinder?: number | null;
}

export interface Stage1CheckResponse {
  is_anomalous: boolean;
  confidence: number;
}

export interface Stage2ClassifyResponse {
  fault_type: string;
  confidence: number;
  key_sensors: SensorChannel[];
  key_time_range: [number, number];
}

export interface AlertItem {
  alert_id: string;
  flight_id: string;
  timestamp: number;
  fault_type: string;
  confidence: number;
  severity: AlertSeverity;
  auto_action_eligible: boolean;
  key_sensors: SensorChannel[];
  report_text?: string;
}

export interface MissionRiskResponse {
  flight_id: string;
  health_score: number;
  recommendation: string;
}

// ─── Replay Event ───────────────────────────────────────────────────────────────

export interface ReplayEvent {
  t: number;
  channel_values: Record<SensorChannel, number>;
  alerts: AlertItem[];
}

// ─── Thermal Heatmap Ranges (for 3D Twin cylinder coloring) ─────────────────────

export const THERMAL_RANGES = {
  CHT: { nominal: [120, 200], caution: [200, 230], critical: [230, 300] },
  EGT: { nominal: [300, 700], caution: [700, 800], critical: [800, 950] },
  OilT: { nominal: [65, 100], caution: [100, 115], critical: [115, 150] },
} as const;

/** Map a temperature value to a normalized 0..1 heat intensity for shader coloring. */
export function thermalIntensity(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// ─── Real-Time WebSocket Telemetry Packet ───────────────────────────────────────

export interface LiveTelemetryPacket {
  type: "telemetry";
  flight_id: string;
  profile?: string;
  t: number;
  duration_seconds: number;
  progress_pct: number;
  rpm: number;
  channels: Record<SensorChannel, number>;
  alerts: AlertItem[];
  mission_risk: MissionRiskResponse;
  stage1_anomaly: boolean;
  stage2_fault: string;
  is_paused: boolean;
  speed: number;
}

export interface FederatedSummary {
  round: number;
  participating_uavs: string[];
  total_samples_aggregated: number;
  global_weight_norm: number;
  collective_faults_learned: string[];
}

// ─── Six Degrees of Freedom (6-DOF) Flight Dynamics & Inertial Navigation ───────

export interface SixDofState {
  // Rotational Degrees of Freedom (Euler Angles & Angular Rates)
  roll: number;              // phi: Bank angle in degrees (-180° to +180°)
  pitch: number;             // theta: Elevation / Climb angle in degrees (-90° to +90°)
  yaw: number;               // psi: Heading / Azimuth in degrees (0° to 360°)
  rollRate: number;          // p: Roll rate (deg/s)
  pitchRate: number;         // q: Pitch rate (deg/s)
  yawRate: number;           // r: Yaw rate (deg/s)

  // Translational Degrees of Freedom (Linear Accelerations & Velocities)
  surgeAx: number;           // a_x: Longitudinal / Forward thrust acceleration (g)
  swayAy: number;            // a_y: Lateral / Cross-axis acceleration (g)
  heaveAz: number;           // a_z: Normal / Vertical load factor (g)
  airspeedKts: number;       // V_TAS: True Airspeed (knots)
  verticalSpeedFpm: number;  // V_z: Vertical rate of climb / descent (ft/min)
  sideslipBeta: number;      // beta: Sideslip angle (deg)

  // Aeromechanical & Engine Coupled Interaction
  torqueRollReaction: number;    // tau_x: Counter-torque roll moment from propeller (N·m)
  gyroPrecessionMoment: number;  // M_gyro: Precession moment from rotating prop inertia (N·m)
  mountVibrationRms: {
    x: number;               // Longitudinal vibration (mm/s RMS)
    y: number;               // Transverse vibration (mm/s RMS)
    z: number;               // Vertical vibration (mm/s RMS)
  };
  isAutopilotCoupled: boolean;
}

