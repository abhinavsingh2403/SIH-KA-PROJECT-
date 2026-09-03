import { motion } from "framer-motion";
import {
  Activity,
  Layers,
  RotateCw,
  Palette,
  Sliders,
  Cpu,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Zap,
} from "lucide-react";
import { type SceneConfig, PALETTES } from "./Scene3D";
import { fadeInUp, slideInRight } from "../lib/motion";

interface OverlayHUDProps {
  config: SceneConfig;
  onChange: (updated: Partial<SceneConfig>) => void;
}

export function OverlayHUD({ config, onChange }: OverlayHUDProps) {
  // Simulated dynamic values based on active fault
  const cylTemps = [
    { id: 1, name: "Cylinder 1 (FL)", temp: config.activeFault === "oil_cooler_degradation" ? 195 : 165 },
    { id: 2, name: "Cylinder 2 (FR)", temp: config.activeFault === "cylinder_head_overheat" ? 245 : config.activeFault === "oil_cooler_degradation" ? 193 : 158 },
    { id: 3, name: "Cylinder 3 (RL)", temp: config.activeFault === "oil_cooler_degradation" ? 200 : 168 },
    { id: 4, name: "Cylinder 4 (RR)", temp: config.activeFault === "oil_cooler_degradation" ? 185 : 155 },
  ];

  const oilT = config.activeFault === "oil_cooler_degradation" ? 128 : 88;
  const oilP = config.activeFault === "oil_cooler_degradation" ? 38 : 62;
  const volts = config.activeFault === "alternator_rectifier_drift" ? 24.2 : 28.2;

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
              <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                config.activeFault
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              }`}>
                {config.activeFault ? "Fault Injected" : "Nominal 60 FPS"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              MALE UAV 4-Cylinder Boxer Engine • Real-Time Telemetry & Thermal Twin
            </p>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="hidden sm:flex items-center gap-3 glass-card px-4 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>WebGL 2.0</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-violet-400" />
            <span>{config.rpm} RPM</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>15 Channels Active</span>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area (Left: Cylinder Thermal Matrix | Right: Controls) */}
      <div className="flex justify-between items-center my-auto">
        {/* Left Floating Cylinder Thermal Status Cards */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="glass-card p-4 w-72 pointer-events-auto space-y-3 shadow-2xl border-white/10 hidden md:block"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Cylinder Thermal Matrix (CHT)</span>
            </div>
            <span className="text-[10px] text-slate-400">Click to focus</span>
          </div>

          <div className="space-y-2">
            {cylTemps.map((cyl) => {
              const isOverheat = cyl.temp > 230;
              const isCaution = cyl.temp > 190 && cyl.temp <= 230;
              const isSelected = config.selectedCylinder === cyl.id;

              return (
                <button
                  key={cyl.id}
                  onClick={() => onChange({ selectedCylinder: isSelected ? null : cyl.id })}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white/15 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : isOverheat
                      ? "bg-red-950/40 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      isOverheat ? "bg-red-400 animate-ping" : isCaution ? "bg-amber-400" : "bg-emerald-400"
                    }`} />
                    <span className="text-xs text-slate-200 font-medium">{cyl.name}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    isOverheat ? "text-red-400" : isCaution ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {cyl.temp}°C
                  </span>
                </button>
              );
            })}
          </div>

          {/* Core Engine Metrics */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 p-1.5 rounded">
              <div className="text-[10px] text-slate-400">Oil Temp</div>
              <div className={`text-xs font-mono font-bold ${oilT > 115 ? "text-red-400" : "text-slate-200"}`}>
                {oilT}°C
              </div>
            </div>
            <div className="bg-white/5 p-1.5 rounded">
              <div className="text-[10px] text-slate-400">Oil Press</div>
              <div className={`text-xs font-mono font-bold ${oilP < 45 ? "text-amber-400" : "text-slate-200"}`}>
                {oilP} psi
              </div>
            </div>
            <div className="bg-white/5 p-1.5 rounded">
              <div className="text-[10px] text-slate-400">Bus Volts</div>
              <div className={`text-xs font-mono font-bold ${volts < 26 ? "text-amber-400" : "text-slate-200"}`}>
                {volts} V
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Floating Control Matrix */}
        <motion.aside
          variants={slideInRight}
          initial="hidden"
          animate="visible"
          className="glass-card p-5 w-80 pointer-events-auto space-y-4 shadow-2xl border-white/10"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sliders className="w-4 h-4 text-violet-400" />
              <span>Digital Twin Controls</span>
            </div>
            <span className="text-[11px] text-slate-400">Interactive</span>
          </div>

          {/* FMEA Fault Injection Quick Triggers */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Inject FMEA Fault Simulation
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onChange({ activeFault: null })}
                className={`text-[11px] p-2 rounded-lg border text-left cursor-pointer flex items-center gap-1.5 ${
                  config.activeFault === null
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-medium"
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Nominal Clean</span>
              </button>

              <button
                onClick={() => onChange({ activeFault: "cylinder_head_overheat", selectedCylinder: 2 })}
                className={`text-[11px] p-2 rounded-lg border text-left cursor-pointer flex items-center gap-1.5 ${
                  config.activeFault === "cylinder_head_overheat"
                    ? "bg-red-500/20 border-red-500/50 text-red-300 font-medium"
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <Flame className="w-3 h-3 text-red-400 shrink-0" />
                <span className="truncate">Cyl 2 Overheat</span>
              </button>

              <button
                onClick={() => onChange({ activeFault: "oil_cooler_degradation" })}
                className={`text-[11px] p-2 rounded-lg border text-left cursor-pointer flex items-center gap-1.5 ${
                  config.activeFault === "oil_cooler_degradation"
                    ? "bg-red-500/20 border-red-500/50 text-red-300 font-medium"
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="truncate">Oil Cooler Loss</span>
              </button>

              <button
                onClick={() => onChange({ activeFault: "alternator_rectifier_drift" })}
                className={`text-[11px] p-2 rounded-lg border text-left cursor-pointer flex items-center gap-1.5 ${
                  config.activeFault === "alternator_rectifier_drift"
                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300 font-medium"
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                <span className="truncate">Alternator Sag</span>
              </button>
            </div>
          </div>

          {/* Theme Palette Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              Palette
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

          {/* Wireframe Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              Wireframe CAD View
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

          {/* Auto Rotation Toggle & Speed */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                Orbital Rotation
              </span>
              <button
                onClick={() => onChange({ autoRotate: !config.autoRotate })}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer ${
                  config.autoRotate ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-slate-800 text-slate-400"
                }`}
              >
                {config.autoRotate ? "ON" : "OFF"}
              </button>
            </div>
            {config.autoRotate && (
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={config.rotationSpeed}
                onChange={(e) => onChange({ rotationSpeed: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            )}
          </div>
        </motion.aside>
      </div>

      {/* Bottom Footer Info */}
      <motion.footer
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Click on any cylinder to inspect telemetry • Orbit: Drag | Zoom: Scroll</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>DRDO SIH26054</span>
          <span>•</span>
          <span className="text-slate-300 font-mono">React 19 + Three.js + R3F</span>
        </div>
      </motion.footer>
    </div>
  );
}
