import { motion } from "framer-motion";
import {
  Activity,
  Layers,
  Palette,
  Sliders,
  Cpu,
  Flame,
  AlertTriangle,
  Gauge,
  Zap,
  Play,
  Pause,
  Maximize2,
  Radio,
} from "lucide-react";
import { type SceneConfig, PALETTES } from "./Scene3D";
import { type LiveTelemetryPacket } from "../types/telemetry";
import { fadeInUp, slideInRight } from "../lib/motion";

interface OverlayHUDProps {
  config: SceneConfig;
  livePacket: LiveTelemetryPacket | null;
  isConnected: boolean;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: number) => void;
  onInjectFault: (faultType: string, targetCylinder?: number, severity?: number) => void;
  onChange: (updated: Partial<SceneConfig>) => void;
}

export function OverlayHUD({
  config,
  livePacket,
  isConnected,
  onPause,
  onResume,
  onSetSpeed,
  onInjectFault,
  onChange,
}: OverlayHUDProps) {
  const currentRPM = livePacket?.rpm || config.rpm;
  const currentSpeed = livePacket?.speed || 1.0;
  const isPaused = livePacket?.is_paused ?? false;

  const currentOilT = livePacket?.channels?.E1_OilT ?? 88;
  const currentOilP = livePacket?.channels?.E1_OilP ?? 62;
  const currentVolts = livePacket?.channels?.volt1 ?? 28.2;
  const healthScore = livePacket?.mission_risk?.health_score ?? 95.0;
  const healthRec = livePacket?.mission_risk?.recommendation ?? "NOMINAL: Engine operational.";

  const isAnomalous = livePacket?.stage1_anomaly ?? false;
  const diagnosedFault = livePacket?.stage2_fault ?? "normal";

  const cylTemps = [
    { id: 1, name: "Cyl 1 (FL)", temp: Math.round(livePacket?.channels?.E1_CHT1 ?? 165) },
    { id: 2, name: "Cyl 2 (FR)", temp: Math.round(livePacket?.channels?.E1_CHT2 ?? 158) },
    { id: 3, name: "Cyl 3 (RL)", temp: Math.round(livePacket?.channels?.E1_CHT3 ?? 168) },
    { id: 4, name: "Cyl 4 (RR)", temp: Math.round(livePacket?.channels?.E1_CHT4 ?? 155) },
  ];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative z-10 w-full h-full min-h-screen pointer-events-none p-6 flex flex-col justify-between">
      {/* Top Header Bar */}
      <motion.header
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between pointer-events-auto"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Flame className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                SIH26054 <span className="text-gradient">Aero Piston Digital Twin</span>
              </h1>
              <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border flex items-center gap-1 ${
                isConnected
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}>
                <Radio className={`w-2.5 h-2.5 ${isConnected ? "animate-pulse" : ""}`} />
                {isConnected ? "Live WS (Port 8000)" : "Local Physics Engine"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              DRDO MALE UAV 4-Cylinder Boxer Engine • 15 Diagnostics Channels Live
            </p>
          </div>
        </div>

        {/* Status Metrics & Health Score */}
        <div className="hidden sm:flex items-center gap-3 glass-card px-4 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>WebGL 60 FPS</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-mono">{currentRPM} RPM</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${
              healthScore < 40 ? "bg-red-500 animate-ping" : healthScore < 70 ? "bg-amber-400" : "bg-emerald-400"
            }`} />
            <span className="text-slate-200 font-semibold">Health: {healthScore}%</span>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area (Left: Thermal Matrix & AI Diagnostics | Right: Controls) */}
      <div className="flex justify-between items-center my-auto">
        {/* Left Floating Cards: Thermal Matrix & AI Safety Layer */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="glass-card p-4 w-80 pointer-events-auto space-y-3 shadow-2xl border-white/10 hidden md:block"
        >
          {/* Cylinder Thermal Matrix */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Cylinder Thermal Matrix (CHT)</span>
            </div>
            <span className="text-[10px] text-slate-400">Click to focus</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {cylTemps.map((cyl) => {
              const isOverheat = cyl.temp > 230;
              const isCaution = cyl.temp > 190 && cyl.temp <= 230;
              const isSelected = config.selectedCylinder === cyl.id;

              return (
                <button
                  key={cyl.id}
                  onClick={() => onChange({ selectedCylinder: isSelected ? null : cyl.id })}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white/15 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : isOverheat
                      ? "bg-red-950/50 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>{cyl.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isOverheat ? "bg-red-400 animate-ping" : isCaution ? "bg-amber-400" : "bg-emerald-400"
                    }`} />
                  </div>
                  <span className={`text-sm font-mono font-bold mt-1 ${
                    isOverheat ? "text-red-400" : isCaution ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {cyl.temp}°C
                  </span>
                </button>
              );
            })}
          </div>

          {/* Engine Vital Signs */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white/5 p-1.5 rounded">
              <div className="text-[9px] text-slate-400">Oil Temp</div>
              <div className={`text-xs font-mono font-bold ${currentOilT > 115 ? "text-red-400" : "text-slate-200"}`}>
                {Math.round(currentOilT)}°C
              </div>
            </div>
            <div className="bg-white/5 p-1.5 rounded">
              <div className="text-[9px] text-slate-400">Oil Press</div>
              <div className={`text-xs font-mono font-bold ${currentOilP < 45 ? "text-amber-400" : "text-slate-200"}`}>
                {Math.round(currentOilP)} psi
              </div>
            </div>
            <div className="bg-white/5 p-1.5 rounded">
              <div className="text-[9px] text-slate-400">Bus Volts</div>
              <div className={`text-xs font-mono font-bold ${currentVolts < 26 ? "text-amber-400" : "text-slate-200"}`}>
                {currentVolts.toFixed(1)} V
              </div>
            </div>
          </div>

          {/* Live AI Safety & Anomaly Diagnostic */}
          <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
            isAnomalous
              ? "bg-red-950/40 border-red-500/40 text-red-200"
              : "bg-emerald-950/20 border-emerald-500/20 text-emerald-200"
          }`}>
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                AI Inference Cascade
              </span>
              <span className="font-mono text-[10px] uppercase">
                {isAnomalous ? "Anomaly Detected" : "Nominal"}
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Stage 2 Classifier: <span className="font-semibold text-white">{diagnosedFault.replace(/_/g, " ")}</span>
            </div>
            <div className="text-[10px] text-slate-400 italic">
              {healthRec}
            </div>
          </div>
        </motion.div>

        {/* Right Floating Control Matrix */}
        <motion.aside
          variants={slideInRight}
          initial="hidden"
          animate="visible"
          className="glass-card p-5 w-84 pointer-events-auto space-y-4 shadow-2xl border-white/10"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sliders className="w-4 h-4 text-violet-400" />
              <span>Digital Twin Command Center</span>
            </div>
            <span className="text-[11px] text-slate-400">Live Control</span>
          </div>

          {/* Exploded View CAD Mode Toggle */}
          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-white">Exploded CAD View</div>
                <div className="text-[10px] text-slate-400">Separates cylinders & components</div>
              </div>
            </div>
            <button
              onClick={() => onChange({ explodedView: !config.explodedView })}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                config.explodedView
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {config.explodedView ? "EXPANDED" : "ASSEMBLED"}
            </button>
          </div>

          {/* Real-Time FMEA Fault Injection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Inject Fault into Physics Stream
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onInjectFault("cylinder_head_overheat", 2, 0.9)}
                className="text-[11px] p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 text-slate-300 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Flame className="w-3 h-3 text-red-400 shrink-0" />
                <span className="truncate">Cyl 2 Overheat</span>
              </button>

              <button
                onClick={() => onInjectFault("oil_cooler_degradation", undefined, 0.85)}
                className="text-[11px] p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-orange-500/20 hover:border-orange-500/40 text-slate-300 hover:text-orange-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="truncate">Oil Cooler Loss</span>
              </button>

              <button
                onClick={() => onInjectFault("alternator_rectifier_drift", undefined, 0.8)}
                className="text-[11px] p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-yellow-500/20 hover:border-yellow-500/40 text-slate-300 hover:text-yellow-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                <span className="truncate">Alternator Drift</span>
              </button>

              <button
                onClick={() => onInjectFault("fuel_flow_oscillation", undefined, 0.75)}
                className="text-[11px] p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">Fuel Hunting</span>
              </button>
            </div>
          </div>

          {/* Theme Palette Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              Theme Palette
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PALETTES).map(([key, item]) => {
                const isActive = config.paletteKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => onChange({ paletteKey: key })}
                    className={`text-[11px] px-2 py-1.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? "bg-white/15 border-violet-400 text-white font-medium"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.primary }} />
                    <span className="truncate">{item.name.split(" ")[1] || item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wireframe & Rotation */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              Wireframe Geometry
            </span>
            <button
              onClick={() => onChange({ wireframe: !config.wireframe })}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.wireframe ? "bg-violet-600" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  config.wireframe ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </motion.aside>
      </div>

      {/* Bottom Floating Telemetry Playback Control Bar */}
      <motion.footer
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="glass-card p-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto border-white/10 shadow-2xl"
      >
        {/* Play / Pause & Speed Multipliers */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isPaused ? onResume() : onPause())}
            className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(139,92,246,0.4)] cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
          </button>

          <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5 gap-1">
            {[1.0, 5.0, 20.0].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  currentSpeed === spd
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-300 font-mono">
            {formatTime(livePacket?.t ?? 120)} / {formatTime(livePacket?.duration_seconds ?? 600)}
          </div>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full sm:w-80 flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-150"
              style={{ width: `${livePacket?.progress_pct ?? 20}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {livePacket?.progress_pct ?? 20}%
          </span>
        </div>

        {/* Telemetry Indicator */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>DRDO SIH26054</span>
          <span>•</span>
          <span className="text-slate-300 font-mono">15-Channel Telemetry Stream</span>
        </div>
      </motion.footer>
    </div>
  );
}
