import { useState, useEffect } from "react";
import {
  Activity,
  Layers,
  RotateCw,
  Cpu,
  AlertTriangle,
  Gauge,
  Play,
  Pause,
  Maximize2,
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Users,
  Compass,
} from "lucide-react";
import { Scene3D, type SceneConfig, PALETTES } from "./Scene3D";
import { TelemetryCharts } from "./TelemetryCharts";
import { type LiveTelemetryPacket, type FederatedSummary } from "../types/telemetry";

interface DashboardProps {
  config: SceneConfig;
  livePacket: LiveTelemetryPacket | null;
  federatedSummary: FederatedSummary | null;
  isConnected: boolean;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: number) => void;
  onSetProfile: (profile: string) => void;
  onTriggerFederated: () => void;
  onInjectFault: (faultType: string, targetCylinder?: number, severity?: number) => void;
  onChange: (updated: Partial<SceneConfig>) => void;
}

export function Dashboard({
  config,
  livePacket,
  federatedSummary,
  isConnected,
  onPause,
  onResume,
  onSetSpeed,
  onSetProfile,
  onTriggerFederated,
  onInjectFault,
  onChange,
}: DashboardProps) {
  // Rolling 35-sample history for time-series charts
  const [history, setHistory] = useState<LiveTelemetryPacket[]>([]);
  const [showFleetModal, setShowFleetModal] = useState(false);

  useEffect(() => {
    if (livePacket) {
      setHistory((prev) => {
        const next = [...prev, livePacket];
        return next.length > 35 ? next.slice(next.length - 35) : next;
      });
    }
  }, [livePacket]);

  const currentRPM = livePacket?.rpm || config.rpm;
  const currentSpeed = livePacket?.speed || 1.0;
  const isPaused = livePacket?.is_paused ?? false;

  const activeProfile = livePacket?.profile || "patrol";
  const healthScore = livePacket?.mission_risk?.health_score ?? 96.0;
  const healthRec = livePacket?.mission_risk?.recommendation ?? "NOMINAL: Engine within flight tolerances.";
  const isAnomalous = livePacket?.stage1_anomaly ?? false;
  const diagnosedFault = livePacket?.stage2_fault ?? "normal";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentFlightTime = livePacket?.t ?? 120;
  const totalFlightTime = livePacket?.duration_seconds ?? 600;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden aerospace-grid-bg text-slate-800">
      {/* ─── 1. ISRO / NASA Mission Control Header Bar ──────────────────────────── */}
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-5 flex items-center justify-between z-20 shrink-0 shadow-sm">
        {/* Left: Mission & Aircraft Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Emblem Badge */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-sky-600 flex items-center justify-center text-white shadow-sm font-black text-xs tracking-tighter">
              SIH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  DRDO <span className="text-orange-600">ISRO-NASA</span> DIGITAL TWIN
                </h1>
                <span className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-semibold">
                  {livePacket?.flight_id ? `ID: ${livePacket.flight_id.slice(0, 12)}` : "MALE UAV • TAPAS-04"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-tech">
                ENGINE: ROTAX-LYCOMING PROXY • 15 SENSOR CHANNELS • 60 FPS 3D
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block" />

          {/* Mission Profile Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-mono-tech text-slate-400 px-1.5 flex items-center gap-1">
              <Compass className="w-3 h-3 text-sky-600" />
              PROFILE:
            </span>
            {(["patrol", "climb", "cruise"] as const).map((p) => (
              <button
                key={p}
                onClick={() => onSetProfile(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold uppercase transition-all cursor-pointer ${
                  activeProfile === p
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden xl:block" />

          {/* Mission Elapsed Time (MET) */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono-tech bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">MET:</span>
            <span className="font-bold text-slate-800">T+{formatTime(currentFlightTime)}</span>
          </div>
        </div>

        {/* Center: System Health & Diagnostic Status */}
        <div className="hidden md:flex items-center gap-3">
          {/* Health Score Pill */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${
            healthScore < 40
              ? "bg-red-50 border-red-300 text-red-700 shadow-sm"
              : healthScore < 70
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-emerald-50 border-emerald-300 text-emerald-700"
          }`}>
            {healthScore < 40 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>HEALTH: {healthScore}%</span>
            <span className="text-[9px] uppercase tracking-wider font-mono-tech">
              ({healthScore < 40 ? "ABORT" : healthScore < 70 ? "CAUTION" : "NOMINAL"})
            </span>
          </div>

          {/* AI Cascade Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${
            isAnomalous
              ? "bg-red-50 border-red-200 text-red-700 font-semibold"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            <Activity className="w-3 h-3 text-sky-600" />
            <span className="font-mono-tech text-[10px]">
              {isAnomalous ? `FAULT: ${diagnosedFault.toUpperCase()}` : "EDGE ANOMALY: NONE"}
            </span>
          </div>
        </div>

        {/* Right: Federated Fleet Trigger & Link Status */}
        <div className="flex items-center gap-2.5">
          {/* Federated Learning Squadron Trigger */}
          <button
            onClick={() => {
              onTriggerFederated();
              setShowFleetModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border bg-gradient-to-r from-sky-600 to-indigo-600 text-white border-sky-700 shadow-xs hover:from-sky-700 hover:to-indigo-700 transition-all cursor-pointer"
            title="Execute Federated Learning FedAvg round across 5-UAV squadron"
          >
            <Users className="w-3.5 h-3.5" />
            <span>FEDAVG FLEET</span>
          </button>

          {/* WebSocket Link Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono-tech ${
            isConnected
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <Radio className={`w-3 h-3 ${isConnected ? "animate-pulse text-emerald-600" : "text-amber-600"}`} />
            <span className="text-[10px] font-bold">
              {isConnected ? "LIVE (8000)" : "LOCAL SIM"}
            </span>
          </div>

          {/* Theme Palette Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {Object.entries(PALETTES).map(([key]) => (
              <button
                key={key}
                onClick={() => onChange({ paletteKey: key })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  config.paletteKey === key
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── 2. Main Mission Split Viewport (3D Twin Left, Telemetry Charts Right) ── */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* LEFT PANE (52% width): 3D Engine Digital Twin in Cleanroom Bench */}
        <section className="w-[52%] flex flex-col aero-panel overflow-hidden relative shadow-sm">
          {/* Top 3D Viewport Controls Bar */}
          <div className="h-10 px-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Cpu className="w-3.5 h-3.5 text-sky-600" />
                3D SPATIAL TWIN
              </span>
              <span className="text-[10px] font-mono-tech text-slate-400">
                60 FPS • THREE.JS / R3F
              </span>
            </div>

            {/* Quick 3D Viewport Actions */}
            <div className="flex items-center gap-2">
              {/* Exploded View Toggle Button */}
              <button
                onClick={() => onChange({ explodedView: !config.explodedView })}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  config.explodedView
                    ? "bg-sky-600 text-white border-sky-700 shadow-sm"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                <span>{config.explodedView ? "EXPLODED CAD" : "ASSEMBLED"}</span>
              </button>

              {/* Wireframe Toggle */}
              <button
                onClick={() => onChange({ wireframe: !config.wireframe })}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  config.wireframe
                    ? "bg-slate-800 text-white border-slate-900"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Toggle Wireframe CAD"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>

              {/* Auto Orbit Toggle */}
              <button
                onClick={() => onChange({ autoRotate: !config.autoRotate })}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  config.autoRotate
                    ? "bg-sky-100 text-sky-700 border-sky-300"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Toggle Orbital Auto-Rotation"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Canvas Body */}
          <div className="flex-1 relative w-full h-full">
            <Scene3D
              config={config}
              livePacket={livePacket}
              onSelectCylinder={(id) => onChange({ selectedCylinder: config.selectedCylinder === id ? null : id })}
            />

            {/* In-Canvas Overlay: RPM & Selected Cylinder Badge */}
            <div className="absolute top-3 left-3 pointer-events-none z-10 flex flex-col gap-1.5">
              <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-lg p-2 shadow-xs text-xs space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Gauge className="w-3.5 h-3.5 text-orange-600" />
                  <span className="font-mono-tech">{currentRPM} RPM</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono-tech">
                  PROPELLER SPEED: {Math.round(currentRPM * 0.15)} rad/s
                </div>
              </div>

              {config.selectedCylinder && (
                <div className="bg-sky-50 border border-sky-300 text-sky-900 rounded-lg px-2.5 py-1 text-xs font-bold shadow-xs">
                  INSPECTING: CYLINDER {config.selectedCylinder} (Click again to clear)
                </div>
              )}
            </div>

            {/* In-Canvas Overlay: FMEA Fault Injection Triggers */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-2.5 shadow-md flex items-center justify-between gap-2 z-10">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                FMEA Fault Simulation:
              </span>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => onInjectFault("normal")}
                  className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${
                    diagnosedFault === "normal"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Nominal Clean
                </button>

                <button
                  onClick={() => onInjectFault("cylinder_head_overheat", 2, 0.9)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${
                    diagnosedFault === "cylinder_head_overheat"
                      ? "bg-red-600 text-white border-red-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700"
                  }`}
                >
                  Cyl 2 Overheat
                </button>

                <button
                  onClick={() => onInjectFault("oil_cooler_degradation", undefined, 0.85)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${
                    diagnosedFault === "oil_cooler_degradation"
                      ? "bg-orange-600 text-white border-orange-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  Oil Cooler Loss
                </button>

                <button
                  onClick={() => onInjectFault("alternator_rectifier_drift", undefined, 0.8)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${
                    diagnosedFault === "alternator_rectifier_drift"
                      ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  Alternator Sag
                </button>

                <button
                  onClick={() => onInjectFault("fuel_flow_oscillation", undefined, 0.75)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${
                    diagnosedFault === "fuel_flow_oscillation"
                      ? "bg-sky-600 text-white border-sky-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  Fuel Hunting
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANE (48% width): Mission Control Aerospace Telemetry Charts */}
        <section className="w-[48%] flex flex-col aero-panel overflow-hidden shadow-sm">
          {/* Top Panel Header */}
          <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                AEROSPACE TELEMETRY & DIAGNOSTICS SUITE
              </span>
            </div>
            <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              15 CHANNELS ACTIVE
            </span>
          </div>

          {/* Body: AI Advisory Banner & Precision Time-Series Graphs */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {/* AI Pilot Copilot Debrief Card */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                  <Bot className="w-3.5 h-3.5 text-sky-700" />
                  AI PILOT COPILOT ADVISORY
                </span>
                <span className="text-[10px] font-mono-tech text-sky-700 font-semibold uppercase">
                  CONFIDENCE: {livePacket?.alerts?.[0]?.confidence ? `${Math.round(livePacket.alerts[0].confidence * 100)}%` : "98% NOMINAL"}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {livePacket?.alerts?.[0]?.report_text || healthRec}
              </p>
            </div>

            {/* Time-Series Charts Component Suite */}
            <TelemetryCharts
              packet={livePacket}
              history={history}
              selectedCylinder={config.selectedCylinder}
              onSelectCylinder={(id) => onChange({ selectedCylinder: config.selectedCylinder === id ? null : id })}
            />
          </div>
        </section>
      </main>

      {/* ─── 3. Bottom Mission Playback Control Bar ───────────────────────────── */}
      <footer className="h-12 border-t border-slate-200 bg-white px-5 flex items-center justify-between shrink-0 z-20 shadow-xs">
        {/* Play / Pause & Speed Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isPaused ? onResume() : onPause())}
            className="h-8 w-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            title={isPaused ? "Resume Flight Stream" : "Pause Flight Stream"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            {[1.0, 5.0, 20.0].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold transition-all cursor-pointer ${
                  currentSpeed === spd
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="text-xs font-mono-tech text-slate-600">
            <span className="font-bold text-slate-900">{formatTime(currentFlightTime)}</span>
            <span className="text-slate-400"> / {formatTime(totalFlightTime)}</span>
          </div>
        </div>

        {/* Scrubber Bar */}
        <div className="w-72 md:w-96 flex items-center gap-2.5">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-sky-600 transition-all duration-150"
              style={{ width: `${livePacket?.progress_pct ?? 20}%` }}
            />
          </div>
          <span className="text-[10px] font-mono-tech font-semibold text-slate-500">
            {livePacket?.progress_pct ?? 20}%
          </span>
        </div>

        {/* DRDO Attribution Badge */}
        <div className="flex items-center gap-2 text-xs font-mono-tech text-slate-400">
          <span>DRDO SIH26054</span>
          <span>•</span>
          <span className="text-slate-600 font-semibold">AI-POWERED REAL-TIME DIGITAL TWIN</span>
        </div>
      </footer>

      {/* ─── 4. Federated Learning Fleet Modal ─────────────────────────────────── */}
      {showFleetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Federated Learning Fleet Aggregation</h3>
                  <p className="text-[11px] text-slate-500">Defense-Grade FedAvg Across 5 DRDO MALE UAVs</p>
                </div>
              </div>
              <button
                onClick={() => setShowFleetModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Round Status:</span>
                  <span className="text-emerald-600 font-bold">FedAvg Converged</span>
                </div>
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Active Squadron Units:</span>
                  <span className="text-slate-800 font-semibold">
                    {federatedSummary?.participating_uavs?.join(", ") || "TAPAS-01, TAPAS-02, TAPAS-03, TAPAS-04, TAPAS-05"}
                  </span>
                </div>
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Samples Aggregated:</span>
                  <span className="text-slate-800 font-semibold">
                    {federatedSummary?.total_samples_aggregated ?? 135} telemetry windows
                  </span>
                </div>
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Global Weight Norm (L2):</span>
                  <span className="text-sky-700 font-bold">
                    {federatedSummary?.global_weight_norm?.toFixed(4) ?? "0.3842"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-sky-50/50 border border-sky-100 text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Defense Privacy Guarantee:</strong> Zero raw telemetry frames left individual UAVs. Only local parameter gradient updates were transferred to the ground station.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => onTriggerFederated()}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                Run Another Round
              </button>
              <button
                onClick={() => setShowFleetModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
