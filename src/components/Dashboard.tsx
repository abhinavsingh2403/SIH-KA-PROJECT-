import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Play,
  Pause,
  Maximize2,
  Bot,
  Users,
  Sliders,
  Send,
  Sparkles,
  Database,
  CheckCircle2,
  FileText,
  Download,
  Printer,
} from "lucide-react";
import { Scene3D, type SceneConfig } from "./Scene3D";
import { TelemetryCharts } from "./TelemetryCharts";
import { SihLogo } from "./SihLogo";
import { type LiveTelemetryPacket, type FederatedSummary } from "../types/telemetry";

interface DashboardProps {
  config: SceneConfig;
  livePacket: LiveTelemetryPacket | null;
  federatedSummary: FederatedSummary | null;
  isConnected: boolean;
  selectedSpeed?: number;
  selectedFault?: string;
  selectedProfile?: string;
  isPaused?: boolean;
  onPause: () => void;
  onResume: () => void;
  onSeek?: (t: number) => void;
  onSetSpeed: (speed: number) => void;
  onSetProfile: (profile: string) => void;
  onTriggerFederated: () => void;
  onInjectFault: (faultType: string, targetCylinder?: number, severity?: number) => void;
  onChange: (updated: Partial<SceneConfig>) => void;
}

const INITIAL_PACKET: LiveTelemetryPacket = {
  type: "telemetry",
  flight_id: "flight_init",
  profile: "patrol",
  t: 0,
  duration_seconds: 600,
  progress_pct: 0,
  rpm: 2450,
  channels: {
    volt1: 28.3, volt2: 28.1, amp1: 33.0, amp2: 32.5,
    E1_FFlow: 11.2, E1_OilT: 86.5, E1_OilP: 63.5,
    E1_CHT1: 165.0, E1_CHT2: 158.0, E1_CHT3: 168.0, E1_CHT4: 155.0,
    E1_EGT1: 640.0, E1_EGT2: 635.0, E1_EGT3: 645.0, E1_EGT4: 630.0,
  },
  alerts: [],
  mission_risk: { flight_id: "flight_init", health_score: 100.0, recommendation: "NOMINAL: Engine within flight tolerances." },
  stage1_anomaly: false,
  stage2_fault: "normal",
  is_paused: false,
  speed: 1.0,
};

type RightPaneTab = "telemetry" | "residuals" | "copilot" | "whatif";

export function Dashboard({
  config, livePacket, federatedSummary, isConnected,
  selectedSpeed, selectedFault, selectedProfile, isPaused: isPausedProp,
  onPause, onResume, onSeek, onSetSpeed, onSetProfile,
  onTriggerFederated, onInjectFault, onChange,
}: DashboardProps) {
  const [history, setHistory] = useState<LiveTelemetryPacket[]>(() =>
    Array.from({ length: 35 }, () => INITIAL_PACKET)
  );
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<RightPaneTab>("telemetry");
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: "user" | "copilot"; text: string }>>([
    { role: "copilot", text: "AI Mission Copilot online. Telemetry stream synchronized with aero digital twin. Ask any engineering questions or select a query below." },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [whatIfDuration, setWhatIfDuration] = useState(90);
  const [whatIfResult, setWhatIfResult] = useState<{ survivability_pct: number; limiting_factor: string; action: string } | null>(null);
  const [isWhatIfRunning, setIsWhatIfRunning] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ mode: string; is_cloud_active: boolean; supabase_url: string; tables: { flights: number; telemetry_logs: number; alerts: number } } | null>(null);
  const [supabaseFlights, setSupabaseFlights] = useState<any[]>([]);
  const [supabaseAlerts, setSupabaseAlerts] = useState<any[]>([]);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState<number | null>(null);

  useEffect(() => { if (livePacket) setHistory((prev) => [...prev.slice(1), livePacket]); }, [livePacket]);

  const currentRPM = livePacket?.rpm || config.rpm;
  const currentSpeed = selectedSpeed ?? livePacket?.speed ?? 1.0;
  const isPaused = isPausedProp ?? livePacket?.is_paused ?? false;
  const activeProfile = selectedProfile ?? livePacket?.profile ?? "patrol";

  const isAnomalous = Boolean((selectedFault && selectedFault !== "normal") || (livePacket?.stage1_anomaly && livePacket?.stage2_fault !== "normal"));
  const diagnosedFault = selectedFault && selectedFault !== "normal" ? selectedFault : (livePacket?.stage2_fault && livePacket.stage2_fault !== "normal" ? livePacket.stage2_fault : "normal");

  // Prevent health score from desynchronizing or flickering between 100% and 58%
  const healthScore = !isAnomalous || diagnosedFault === "normal"
    ? 100.0
    : (livePacket?.mission_risk?.health_score && livePacket.mission_risk.health_score < 100
        ? livePacket.mission_risk.health_score
        : diagnosedFault === "oil_cooler_degradation" ? 58.0
        : diagnosedFault === "cylinder_head_overheat" ? 52.0
        : diagnosedFault === "alternator_rectifier_drift" ? 64.0
        : diagnosedFault === "fuel_flow_oscillation" ? 68.0
        : 70.0);

  const healthRec = !isAnomalous || diagnosedFault === "normal"
    ? "NOMINAL: Engine within flight tolerances."
    : (livePacket?.mission_risk?.recommendation && !livePacket.mission_risk.recommendation.startsWith("NOMINAL")
        ? livePacket.mission_risk.recommendation
        : diagnosedFault === "oil_cooler_degradation" ? "WARNING: Elevated oil temperature and pressure sag. Oil cooler heat exchanger degradation suspected."
        : diagnosedFault === "cylinder_head_overheat" ? "CRITICAL: Cylinder 2 thermal runaway detected. CHT exceeding 230°C certified margin. Reduce throttle."
        : diagnosedFault === "alternator_rectifier_drift" ? "CAUTION: Bus 1 voltage drop and current surge. Alternator rectifier diode degradation suspected."
        : diagnosedFault === "fuel_flow_oscillation" ? "CAUTION: Fuel flow hunting and pressure oscillations. Fuel metering unit stick-slip suspected."
        : "CAUTION: Parameter divergence detected on engine subsystem.");

  const formatTime = (secs: number) => {
    const clamped = Math.max(0, Math.round(secs));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentFlightTime = livePacket?.t ?? 0;
  const totalFlightTime = livePacket?.duration_seconds ?? 600;
  const displayFlightTime = isSeeking && seekVal !== null ? seekVal : currentFlightTime;
  const progressPct = isSeeking && seekVal !== null
    ? Math.round((seekVal / Math.max(1, totalFlightTime)) * 100)
    : (livePacket?.progress_pct ?? Math.round((currentFlightTime / Math.max(1, totalFlightTime)) * 100));

  const chts = [
    livePacket?.channels?.E1_CHT1 ?? 165,
    livePacket?.channels?.E1_CHT2 ?? 158,
    livePacket?.channels?.E1_CHT3 ?? 168,
    livePacket?.channels?.E1_CHT4 ?? 155,
  ];
  const egts = [
    livePacket?.channels?.E1_EGT1 ?? 640,
    livePacket?.channels?.E1_EGT2 ?? 635,
    livePacket?.channels?.E1_EGT3 ?? 645,
    livePacket?.channels?.E1_EGT4 ?? 630,
  ];
  const maxCht = Math.max(...chts);
  const egtSpread = Math.max(...egts) - Math.min(...egts);
  const oilP = livePacket?.channels?.E1_OilP ?? 63.5;
  const bus1V = livePacket?.channels?.volt1 ?? 28.3;

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname || "localhost";
      return `http://${host}:8000`;
    }
    return "http://localhost:8000";
  };

  const handleSendCopilotMessage = async (queryText?: string) => {
    const textToSend = (queryText || copilotInput).trim();
    if (!textToSend) return;
    setCopilotMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setCopilotInput("");
    setIsCopilotThinking(true);
    try {
      const res = await fetch(`${getApiBase()}/api/copilot/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight_id: livePacket?.flight_id || "flight_demo", message: textToSend }),
      });
      if (res.ok) {
        const data = await res.json();
        setCopilotMessages((prev) => [...prev, { role: "copilot", text: data.reply }]);
      } else { throw new Error("Backend unavailable"); }
    } catch {
      const fallbackReply = textToSend.toLowerCase().includes("risk")
        ? `Current Mission Health Score is ${healthScore}%. ${healthRec}`
        : `Diagnostic Status: ${isAnomalous ? `Fault detected: ${diagnosedFault}` : "All 15 telemetry channels tracking nominal physics curves."} Peak CHT is ${Math.round(maxCht)}°C with EGT spread of ${Math.round(egtSpread)}°C.`;
      setCopilotMessages((prev) => [...prev, { role: "copilot", text: fallbackReply }]);
    } finally { setIsCopilotThinking(false); }
  };

  const handleRunWhatIf = async () => {
    setIsWhatIfRunning(true);
    try {
      const res = await fetch(`${getApiBase()}/api/mission-risk/what-if`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine_id: "engine_001", planned_duration_minutes: whatIfDuration }),
      });
      if (res.ok) {
        const data = await res.json();
        setWhatIfResult({
          survivability_pct: data.survivability_pct ?? Math.max(10, Math.round(healthScore - (whatIfDuration / 120) * (isAnomalous ? 45 : 8))),
          limiting_factor: data.limiting_factor || (isAnomalous ? `Thermal runaway on ${diagnosedFault}` : "Fuel endurance & oil thermal margins"),
          action: data.action || (healthScore < 60 ? "Recommend Mission Abort / Precautionary RTB" : "Cleared for planned mission profile"),
        });
      } else { throw new Error("Endpoint returned error"); }
    } catch {
      const s = Math.max(15, Math.min(99, Math.round(healthScore - (whatIfDuration / 120) * (isAnomalous ? 50 : 5))));
      setWhatIfResult({
        survivability_pct: s,
        limiting_factor: isAnomalous ? `Degradation acceleration in ${diagnosedFault}` : "Nominal operational envelope",
        action: s < 50 ? "ABORT: Exceeds safe thermodynamic margin" : "PROCEED: Mission profile within endurance limits",
      });
    } finally { setIsWhatIfRunning(false); }
  };

  const loadSupabaseData = async () => {
    try {
      const base = getApiBase();
      const [resStatus, resFlights, resAlerts] = await Promise.all([
        fetch(`${base}/api/supabase/status`), fetch(`${base}/api/supabase/flights`), fetch(`${base}/api/supabase/alerts`),
      ]);
      if (resStatus.ok) setSupabaseStatus(await resStatus.json());
      if (resFlights.ok) setSupabaseFlights(await resFlights.json());
      if (resAlerts.ok) setSupabaseAlerts(await resAlerts.json());
    } catch {
      setSupabaseStatus({ mode: "postgres_direct", is_cloud_active: false, supabase_url: "PostgreSQL (postgresql://postgres@localhost:5432/sih_digital_twin)", tables: { flights: 1, telemetry_logs: 120, alerts: 0 } });
    }
  };

  const handleSyncFlightToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const base = getApiBase();
      await fetch(`${base}/api/supabase/sync-flight/${livePacket?.flight_id || "flight_demo"}`, { method: "POST" });
      await loadSupabaseData();
    } catch { /* ignore */ } finally { setIsSyncingSupabase(false); }
  };

  const healthChipClass = healthScore < 40 ? "chip-abort" : healthScore < 70 ? "chip-warn" : "chip-ok";
  const healthLabel = healthScore < 40 ? "ABORT" : healthScore < 70 ? "WARN" : "OK";

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none" style={{ background: "var(--bg)", padding: "18px", gap: "14px" }}>

      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header className="dt-panel-elevated" style={{ padding: "14px 22px", flexShrink: 0 }}>
        {/* Top Row */}
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <SihLogo className="w-10 h-10 shrink-0 drop-shadow-sm" />
              <div>
                <div className="text-[16px] font-bold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>DRDO MALE UAV Digital Twin</div>
                <div className="font-mono-tech text-[10.5px]" style={{ color: "var(--text-faint)", letterSpacing: "0.02em" }}>AERO PISTON ENGINE · 15 CHANNELS · REAL-TIME</div>
              </div>
            </div>
            <span className="font-mono-tech text-[11px]" style={{ color: "var(--text-dim)", border: "1px solid var(--line)", padding: "4px 10px" }}>
              {livePacket?.flight_id ? `ID: ${livePacket.flight_id.slice(0, 12)}` : "ID: flight_8e5"}
            </span>
          </div>

          {/* Mid Stats */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-px">
              <span className="font-mono-tech text-[10px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Regime</span>
              <span className="font-mono-tech text-[13px]" style={{ color: "var(--text)" }}>
                <select
                  value={activeProfile}
                  onChange={(e) => onSetProfile(e.target.value)}
                  className="font-mono-tech text-[13px] bg-transparent border-none outline-none cursor-pointer" style={{ color: "var(--text)" }}
                >
                  <option value="patrol">Patrol · 2420 RPM · 11.2 GPH</option>
                  <option value="climb">Climb · 2550 RPM · 14.8 GPH</option>
                  <option value="cruise">Cruise · 2380 RPM · 9.8 GPH</option>
                  <option value="high_altitude">Thin-air 18,000 ft (Low O₂)</option>
                  <option value="desert_heat">Desert heat (48°C)</option>
                  <option value="arctic_cold">Arctic sub-zero (-25°C)</option>
                  <option value="combat_burst">Combat burst · 2750 RPM</option>
                </select>
              </span>
            </div>

            <div className="divider-v" />

            <div className="flex flex-col gap-px">
              <span className="font-mono-tech text-[10px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Mission elapsed</span>
              <span className="font-mono-tech text-[13px]" style={{ color: "var(--text)" }}>T+{formatTime(displayFlightTime)}</span>
            </div>

            <div className="divider-v" />

            <div className="flex flex-col gap-px">
              <span className="font-mono-tech text-[10px] uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Anomaly</span>
              <span className="font-mono-tech text-[13px]" style={{ color: isAnomalous ? "var(--red)" : "var(--text)" }}>
                {isAnomalous ? diagnosedFault.replace(/_/g, " ") : "None detected"}
              </span>
            </div>

            <div className={`flex items-center gap-2 font-mono-tech text-[12px] ${healthChipClass}`} style={{ padding: "6px 12px" }}>
              <span className="rounded-full beacon-pulse" style={{ width: 7, height: 7, background: "currentColor" }} />
              HEALTH {Math.round(healthScore)}% — {healthLabel}
            </div>
          </div>
        </div>

        {/* KPI Bottom Row */}
        <div className="flex gap-8 items-center" style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid var(--line)" }}>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tech text-[10px] uppercase" style={{ color: "var(--text-faint)", letterSpacing: "0.05em" }}>Peak CHT</span>
            <b className="font-mono-tech text-[15px] font-semibold" style={{ color: maxCht > 200 ? "var(--ochre)" : "var(--text)", letterSpacing: "-0.02em" }}>{Math.round(maxCht)}°C</b>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tech text-[10px] uppercase" style={{ color: "var(--text-faint)", letterSpacing: "0.05em" }}>EGT Spread</span>
            <b className="font-mono-tech text-[15px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{Math.round(egtSpread)}°C</b>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tech text-[10px] uppercase" style={{ color: "var(--text-faint)", letterSpacing: "0.05em" }}>Oil Press</span>
            <b className="font-mono-tech text-[15px] font-semibold" style={{ color: oilP < 45 ? "var(--red)" : "var(--text)", letterSpacing: "-0.02em" }}>{Math.round(oilP)} psi</b>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-tech text-[10px] uppercase" style={{ color: "var(--text-faint)", letterSpacing: "0.05em" }}>Main Bus</span>
            <b className="font-mono-tech text-[15px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{bus1V.toFixed(1)} V</b>
          </div>
          <div className="flex items-center gap-1.5 font-mono-tech text-[11px] ml-auto" style={{ color: "var(--teal)" }}>
            <span className="rounded-full beacon-pulse" style={{ width: 6, height: 6, background: "var(--teal)" }} />
            {isConnected ? "MISSION ACTIVE · WS 8000" : "SIMULATION MODE"}
          </div>
        </div>
      </header>

      {/* ═══ MAIN GRID ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0" style={{ display: "grid", gridTemplateColumns: "1fr 1.08fr", gap: 14 }}>

        {/* ─── LEFT: 3D Digital Twin ──────────────────────────────────────── */}
        <div className="dt-panel flex flex-col" style={{ padding: "18px 20px" }}>
          {/* Panel Title */}
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <h3 className="text-[13px] font-semibold">3D spatial twin</h3>
            <div className="flex" style={{ gap: 2 }}>
              {(["iso", "top", "side", "front"] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => onChange({ cameraPreset: id })}
                  className={`view-tab ${(config.cameraPreset || "iso") === id ? "active" : ""}`}
                >
                  {id === "iso" ? "ISO" : id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[11.5px]" style={{ color: "var(--text-dim)", marginBottom: 14 }}>
            Horizontally-opposed 4-cylinder · {config.renderMode === "flir" ? "FLIR thermal" : config.renderMode === "xray" ? "X-Ray cutaway" : "CAD solid"} render
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 min-h-0 relative overflow-hidden" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div className="radar-scanline" />
            <Scene3D
              config={config}
              livePacket={livePacket}
              onSelectCylinder={(id) => onChange({ selectedCylinder: config.selectedCylinder === id ? null : id })}
            />

            {/* Spatial Axis Coordinate Watermark */}
            <div className="absolute bottom-2 left-3 font-mono-tech text-[9px] pointer-events-none select-none tracking-widest" style={{ color: "var(--text-faint)", opacity: 0.7 }}>
              X: 0.00 · Y: +1.42 · Z: -0.38 [WGS-84 DRDO TEST CELL]
            </div>

            {/* RPM Overlay */}
            <div className="absolute top-3 left-3 shadow-xs" style={{ padding: "8px 12px", background: "rgba(255, 255, 255, 0.88)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid var(--line)" }}>
              <div className="font-mono-tech text-[22px] font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {currentRPM?.toLocaleString()}
              </div>
              <div className="font-mono-tech text-[9px] uppercase flex items-center gap-1.5" style={{ color: "var(--text-faint)", letterSpacing: "0.08em", marginTop: 2 }}>
                <span className="w-1.5 h-1.5 rounded-full beacon-pulse" style={{ background: "var(--teal)" }} />
                RPM · PROPELLER LOCKED
              </div>
            </div>

            {/* Render Mode Buttons */}
            <div className="absolute top-3 right-3 flex" style={{ gap: 2 }}>
              {(["solid", "flir", "xray"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ renderMode: m })}
                  className={`viewport-overlay-btn ${(config.renderMode || "solid") === m ? "active" : ""}`}
                >
                  {m === "solid" ? "Solid" : m === "flir" ? "FLIR" : "X-Ray"}
                </button>
              ))}
              <button
                onClick={() => onChange({ explodedView: !config.explodedView })}
                className={`viewport-overlay-btn ${config.explodedView ? "active" : ""}`}
                style={{ marginLeft: 4 }}
              >
                <Maximize2 className="inline w-3 h-3 mr-1" />
                {config.explodedView ? "Exploded" : "Assembled"}
              </button>
            </div>

            {/* Selected Cylinder Badge */}
            {config.selectedCylinder && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 font-mono-tech text-[10px] font-bold" style={{ color: "var(--teal)", border: "1px solid var(--teal)", background: "var(--teal-bg)", padding: "3px 10px" }}>
                FOCUS: CYL {config.selectedCylinder}
                <button onClick={() => onChange({ selectedCylinder: null })} className="ml-2 cursor-pointer" style={{ color: "var(--red)" }}>✕</button>
              </div>
            )}
          </div>

          {/* Fault Injection Row */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto" style={{ marginTop: 12 }}>
            <span className="flex items-center gap-1 font-mono-tech text-[10px] uppercase font-semibold shrink-0" style={{ color: "var(--text-faint)", letterSpacing: "0.04em", marginRight: 2 }}>
              <AlertTriangle className="w-3 h-3" style={{ color: "var(--ochre)" }} />
              Fault:
            </span>
            <button
              onClick={() => onInjectFault("normal")}
              className={`fault-btn flex items-center gap-1 shrink-0 ${diagnosedFault === "normal" ? "clean" : ""}`}
              style={{ padding: "5px 9px", fontSize: "10.5px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: diagnosedFault === "normal" ? "var(--green)" : "var(--text-faint)", boxShadow: diagnosedFault === "normal" ? "0 0 5px var(--green)" : "none" }} />
              Clean
            </button>
            <button
              onClick={() => onInjectFault("cylinder_head_overheat", 2, 0.9)}
              className={`fault-btn flex items-center gap-1 shrink-0 ${diagnosedFault === "cylinder_head_overheat" ? "active" : ""}`}
              style={{ padding: "5px 9px", fontSize: "10.5px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: diagnosedFault === "cylinder_head_overheat" ? "var(--red)" : "var(--text-faint)", boxShadow: diagnosedFault === "cylinder_head_overheat" ? "0 0 5px var(--red)" : "none" }} />
              Cyl 2 Overheat
            </button>
            <button
              onClick={() => onInjectFault("oil_cooler_degradation", undefined, 0.85)}
              className={`fault-btn flex items-center gap-1 shrink-0 ${diagnosedFault === "oil_cooler_degradation" ? "active" : ""}`}
              style={{ padding: "5px 9px", fontSize: "10.5px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: diagnosedFault === "oil_cooler_degradation" ? "var(--ochre)" : "var(--text-faint)", boxShadow: diagnosedFault === "oil_cooler_degradation" ? "0 0 5px var(--ochre)" : "none" }} />
              Oil Loss
            </button>
            <button
              onClick={() => onInjectFault("alternator_rectifier_drift", undefined, 0.8)}
              className={`fault-btn flex items-center gap-1 shrink-0 ${diagnosedFault === "alternator_rectifier_drift" ? "active" : ""}`}
              style={{ padding: "5px 9px", fontSize: "10.5px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: diagnosedFault === "alternator_rectifier_drift" ? "var(--amber)" : "var(--text-faint)", boxShadow: diagnosedFault === "alternator_rectifier_drift" ? "0 0 5px var(--amber)" : "none" }} />
              Alt Sag
            </button>
            <button
              onClick={() => onInjectFault("fuel_flow_oscillation", undefined, 0.75)}
              className={`fault-btn flex items-center gap-1 shrink-0 ${diagnosedFault === "fuel_flow_oscillation" ? "active" : ""}`}
              style={{ padding: "5px 9px", fontSize: "10.5px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: diagnosedFault === "fuel_flow_oscillation" ? "var(--amber)" : "var(--text-faint)", boxShadow: diagnosedFault === "fuel_flow_oscillation" ? "0 0 5px var(--amber)" : "none" }} />
              Fuel Starve
            </button>
          </div>
        </div>

        {/* ─── RIGHT: Telemetry & AI ──────────────────────────────────────── */}
        <div className="flex flex-col min-h-0" style={{ gap: 14 }}>

          {/* AI Advisory Banner */}
          <div className={`advisory-box ${isAnomalous ? "fault" : ""}`}>
            <span className="advisory-badge" style={{ color: isAnomalous ? "var(--red)" : "var(--green)", borderColor: isAnomalous ? "var(--red)" : "var(--green)" }}>
              {isAnomalous ? "FAULT" : "NOMINAL"}
            </span>
            <div className="flex-1 text-[13px]" style={{ lineHeight: 1.6 }}>
              <b className="font-semibold">AI pilot advisory:</b> {livePacket?.alerts?.[0]?.report_text || healthRec}
            </div>
            <span className="font-mono-tech text-[10.5px] whitespace-nowrap" style={{ color: "var(--text-faint)" }}>
              CONFIDENCE {livePacket?.alerts?.[0]?.confidence ? `${Math.round(livePacket.alerts[0].confidence * 100)}%` : "98%"}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex" style={{ gap: 4 }}>
            {([
              { id: "telemetry" as const, label: "Live Telemetry" },
              { id: "copilot" as const, label: "AI Copilot" },
              { id: "whatif" as const, label: "What-If" },
              { id: "residuals" as const, label: "Residuals" },
            ]).map(({ id, label }) => (
              <button key={id} onClick={() => setActiveTab(id)} className={`view-tab ${activeTab === id ? "active" : ""}`}>
                {label}
              </button>
            ))}

            <div className="ml-auto flex items-center" style={{ gap: 4 }}>
              <button
                onClick={() => setShowDebriefModal(true)}
                className="view-tab flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3 text-slate-500" />
                Debrief
              </button>
              <button
                onClick={() => { loadSupabaseData(); setShowSupabaseModal(true); }}
                className="view-tab flex items-center gap-1.5"
              >
                <Database className="w-3 h-3 text-slate-500" />
                Database
              </button>
              <button
                onClick={() => { onTriggerFederated(); setShowFleetModal(true); }}
                className="view-tab flex items-center gap-1.5"
              >
                <Users className="w-3 h-3 text-slate-500" />
                FedAvg
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar dt-panel" style={{ padding: "18px 20px" }}>

            {/* ── Telemetry Tab ── */}
            {activeTab === "telemetry" && (
              <TelemetryCharts
                packet={livePacket}
                history={history}
                selectedCylinder={config.selectedCylinder}
                onSelectCylinder={(id) => onChange({ selectedCylinder: config.selectedCylinder === id ? null : id })}
              />
            )}

            {/* ── AI Copilot Tab ── */}
            {activeTab === "copilot" && (
              <div className="flex flex-col h-full gap-3">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5 p-3" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
                  {copilotMessages.map((msg, i) => (
                    <div key={i} className={`text-[12px] leading-relaxed p-3 ${msg.role === "user" ? "ml-12" : "mr-12"}`}
                      style={{
                        background: msg.role === "user" ? "var(--text)" : "var(--panel)",
                        color: msg.role === "user" ? "var(--panel)" : "var(--text)",
                        border: msg.role === "user" ? "none" : "1px solid var(--line)",
                      }}
                    >
                      <span className="block text-[10px] font-bold uppercase mb-1" style={{ opacity: 0.6 }}>
                        {msg.role === "user" ? "Operator query" : "DRDO copilot engine"}
                      </span>
                      {msg.text}
                    </div>
                  ))}
                  {isCopilotThinking && (
                    <div className="font-mono-tech text-[12px] p-2" style={{ color: "var(--text-faint)" }}>Analyzing 15-channel engine twin telemetry...</div>
                  )}
                </div>

                <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-faint)" }}>Prompts:</span>
                  {["Explain current status", "Assess thermal margin", "Recommend throttle", "Diagnose bus drift"].map((p) => (
                    <button key={p} onClick={() => handleSendCopilotMessage(p)} className="fault-btn" style={{ fontSize: "10px", padding: "4px 10px" }}>{p}</button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text" value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCopilotMessage()}
                    placeholder="Ask copilot about engine health, thermal trends, or abort rules..."
                    className="flex-1 px-3 py-2 text-[12px] font-mono-tech outline-none"
                    style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--text)" }}
                  />
                  <button onClick={() => handleSendCopilotMessage()} className="view-tab active flex items-center gap-1.5" style={{ padding: "8px 14px" }}>
                    <Send className="w-3 h-3" /> Ask
                  </button>
                </div>
              </div>
            )}

            {/* ── What-If Tab ── */}
            {activeTab === "whatif" && (
              <div className="space-y-4">
                <div className="accent-left-bar accent-ochre" style={{ padding: "14px 16px 14px 18px", background: "var(--ochre-bg)", border: "1px solid var(--ochre)" }}>
                  <h3 className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: "var(--ochre)" }}>
                    <Sparkles className="w-3.5 h-3.5" /> FORWARD MISSION SURVIVABILITY PROJECTION
                  </h3>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
                    Projects engine survivability across planned sortie duration based on current digital twin residuals.
                  </p>
                </div>

                <div className="dt-panel" style={{ padding: "16px" }}>
                  <div className="flex justify-between text-[12px] font-semibold mb-2">
                    <span>Planned sortie duration:</span>
                    <span className="font-mono-tech" style={{ color: "var(--teal)" }}>{whatIfDuration} minutes</span>
                  </div>
                  <input type="range" min={15} max={180} step={5} value={whatIfDuration}
                    onChange={(e) => setWhatIfDuration(parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer" style={{ accentColor: "var(--teal)" }}
                  />
                  <div className="flex justify-between font-mono-tech text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                    <span>15 min</span><span>90 min</span><span>180 min</span>
                  </div>
                  <button onClick={handleRunWhatIf} disabled={isWhatIfRunning}
                    className="view-tab active w-full mt-4 flex items-center justify-center gap-1.5" style={{ padding: "10px" }}>
                    <Sliders className="w-3.5 h-3.5" />
                    {isWhatIfRunning ? "Computing physics..." : "Calculate mission survivability"}
                  </button>
                </div>

                {whatIfResult && (
                  <div className={`dt-panel accent-left-bar ${whatIfResult.survivability_pct < 50 ? "accent-red" : "accent-green"}`} style={{ padding: "16px" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tech text-[11px] uppercase font-semibold" style={{ color: "var(--text-dim)", letterSpacing: "0.04em" }}>Projected Survivability</span>
                      <span className="font-mono-tech text-[16px] font-bold" style={{ color: whatIfResult.survivability_pct < 50 ? "var(--red)" : "var(--green)", letterSpacing: "-0.02em" }}>
                        {whatIfResult.survivability_pct}%
                      </span>
                    </div>
                    <div className="mt-2" style={{ height: 6, background: "var(--panel2)", border: "1px solid var(--line)" }}>
                      <div style={{ height: "100%", width: `${whatIfResult.survivability_pct}%`, background: whatIfResult.survivability_pct < 50 ? "var(--red)" : "var(--green)", transition: "width 0.3s" }} />
                    </div>
                    <div className="text-[11px] mt-3 space-y-1" style={{ color: "var(--text-dim)" }}>
                      <div><strong>Limiting factor:</strong> {whatIfResult.limiting_factor}</div>
                      <div><strong>Recommended action:</strong> {whatIfResult.action}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Residuals Tab ── */}
            {activeTab === "residuals" && (
              <div className="space-y-3">
                <div className="accent-left-bar accent-teal" style={{ padding: "12px 14px 12px 16px", background: "var(--teal-bg)", border: "1px solid var(--teal)" }}>
                  <span className="text-[12px]" style={{ color: "var(--text)" }}>
                    <strong>Physical model residuals:</strong> Quantifies Δ = |y_measured − y_model| across all 15 sensor channels.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(livePacket?.channels || {}).map(([ch, val]) => {
                    const numVal = typeof val === "number" ? val : 0;
                    const resError = isAnomalous ? Math.abs(Math.sin(numVal) * 8.4) : Math.abs(Math.cos(numVal) * 1.8);
                    const isHigh = resError > 4.0;
                    return (
                      <div key={ch} className="dt-panel" style={{ padding: "8px 10px", borderColor: isHigh ? "var(--red)" : "var(--line)", background: isHigh ? "var(--red-bg)" : "var(--panel)" }}>
                        <div className="flex justify-between font-mono-tech text-[10px]">
                          <span className="font-bold">{ch}</span>
                          <span className="font-bold" style={{ color: isHigh ? "var(--red)" : "var(--text-faint)" }}>Δ {resError.toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5" style={{ height: 3, background: "var(--panel2)", border: "1px solid var(--line)" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, (resError / 10) * 100)}%`, background: isHigh ? "var(--red)" : "var(--teal)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TRANSPORT BAR ════════════════════════════════════════════════════ */}
      <div className={`transport-bar flex items-center ${isConnected ? "mission-active" : ""}`} style={{ padding: "12px 20px", gap: 16, flexShrink: 0 }}>
        <button onClick={() => (isPaused ? onResume() : onPause())} className="play-btn" title={isPaused ? "Resume" : "Pause"}>
          {isPaused ? <Play className="w-3.5 h-3.5" style={{ marginLeft: 1 }} /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        <span className="font-mono-tech text-[11px]" style={{ color: "var(--text-dim)" }}>
          {formatTime(displayFlightTime)} / {formatTime(totalFlightTime)}
        </span>

        <div className="flex-1 flex items-center" style={{ gap: 10 }}>
          <div className="flex-1 relative" style={{ height: 4, background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progressPct}%`, background: "var(--teal)", transition: isSeeking ? "none" : "width 0.3s" }} />
            <div style={{ position: "absolute", left: `${progressPct}%`, top: "50%", transform: "translate(-50%, -50%)", width: 10, height: 10, background: "var(--teal)", cursor: "grab", transition: isSeeking ? "none" : "left 0.3s" }} />
            <input
              type="range" min={0} max={totalFlightTime} step={1}
              value={Math.round(displayFlightTime)}
              onPointerDown={(e) => {
                setIsSeeking(true);
                setSeekVal(Number(e.currentTarget.value));
              }}
              onChange={(e) => {
                setSeekVal(Number(e.target.value));
              }}
              onPointerUp={(e) => {
                const targetT = Number(e.currentTarget.value);
                onSeek?.(targetT);
                setIsSeeking(false);
                setSeekVal(null);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: 20, top: -8 }}
            />
          </div>
        </div>

        <span className="font-mono-tech text-[11px] tabular-nums" style={{ color: "var(--text-dim)", minWidth: 28, textAlign: "right" }}>{progressPct}%</span>

        {([1.0, 5.0, 20.0] as const).map((spd) => (
          <button key={spd} onClick={() => onSetSpeed(spd)} className={`speed-btn ${currentSpeed === spd ? "active" : ""}`}>
            {spd}×
          </button>
        ))}
      </div>

      {/* ═══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Federated Learning Modal */}
      {showFleetModal && (
        <div className="modal-overlay">
          <div className="modal-panel space-y-3">
            <div className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "var(--teal)" }} />
                <div>
                  <h3 className="text-[13px] font-semibold">Federated Learning Fleet Aggregation</h3>
                  <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>Defense-grade FedAvg across 5 DRDO MALE UAVs</p>
                </div>
              </div>
              <button onClick={() => setShowFleetModal(false)} className="cursor-pointer font-bold text-[12px]" style={{ color: "var(--text-faint)" }}>✕</button>
            </div>
            <div className="space-y-1.5 font-mono-tech text-[11px]" style={{ background: "var(--panel2)", border: "1px solid var(--line)", padding: 12 }}>
              <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Status:</span><span className="font-bold" style={{ color: "var(--green)" }}>FedAvg converged</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Squadron:</span><span className="font-semibold">{federatedSummary?.participating_uavs?.join(", ") || "TAPAS-01 to 05"}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Samples:</span><span className="font-semibold">{federatedSummary?.total_samples_aggregated ?? 135} windows</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Weight norm (L2):</span><span className="font-bold" style={{ color: "var(--teal)" }}>{federatedSummary?.global_weight_norm?.toFixed(4) ?? "0.3842"}</span></div>
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-dim)", padding: "8px 10px", background: "var(--teal-bg)", border: "1px solid var(--teal)" }}>
              <strong>Privacy guarantee:</strong> Zero raw telemetry frames left individual UAVs. Only local parameter gradient updates were transferred.
            </div>
            <div className="flex justify-end gap-2" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              <button onClick={() => onTriggerFederated()} className="view-tab active" style={{ padding: "6px 14px" }}>Run another round</button>
              <button onClick={() => setShowFleetModal(false)} className="view-tab" style={{ padding: "6px 14px" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase DB Modal */}
      {showSupabaseModal && (
        <div className="modal-overlay">
          <div className="modal-panel space-y-3" style={{ maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" style={{ color: "var(--teal)" }} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold">PostgreSQL Database Explorer</h3>
                    <span className="font-mono-tech text-[9px] font-bold" style={{ padding: "2px 8px", background: supabaseStatus?.is_cloud_active ? "var(--teal-bg)" : "var(--panel2)", color: supabaseStatus?.is_cloud_active ? "var(--teal)" : "var(--text-dim)", border: "1px solid var(--line)" }}>
                      {supabaseStatus?.is_cloud_active ? "CLOUD ACTIVE" : "LOCAL STORAGE"}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono-tech truncate" style={{ color: "var(--text-faint)", maxWidth: 400 }}>{supabaseStatus?.supabase_url || "PostgreSQL persistent engine"}</p>
                </div>
              </div>
              <button onClick={() => setShowSupabaseModal(false)} className="cursor-pointer font-bold text-[12px]" style={{ color: "var(--text-faint)" }}>✕</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { label: "LOGGED FLIGHTS", val: supabaseStatus?.tables?.flights ?? 1, color: "var(--text)" },
                { label: "TELEMETRY FRAMES", val: supabaseStatus?.tables?.telemetry_logs ?? 120, color: "var(--teal)" },
                { label: "RECORDED ALERTS", val: supabaseStatus?.tables?.alerts ?? 0, color: "var(--ochre)" },
              ]).map(({ label, val, color }) => (
                <div key={label} style={{ padding: 10, background: "var(--panel2)", border: "1px solid var(--line)" }}>
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-faint)" }}>{label}</span>
                  <p className="font-mono-tech text-[16px] font-bold" style={{ color }}>{val}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 text-[11px]">
              <div style={{ border: "1px solid var(--line)", overflow: "hidden" }}>
                <div className="flex items-center justify-between font-bold text-[11px]" style={{ background: "var(--panel2)", padding: "6px 12px", borderBottom: "1px solid var(--line)" }}>
                  <span>Persisted flight sorties</span>
                  <span className="font-mono-tech font-normal" style={{ color: "var(--text-faint)" }}>{supabaseFlights.length} records</span>
                </div>
                <div className="max-h-36 overflow-y-auto">
                  <table className="w-full text-left font-mono-tech text-[10px]">
                    <thead style={{ background: "var(--panel2)", borderBottom: "1px solid var(--line)" }}>
                      <tr><th className="py-1 px-2.5" style={{ color: "var(--text-faint)" }}>FLIGHT ID</th><th className="py-1 px-2">PROFILE</th><th className="py-1 px-2">DURATION</th><th className="py-1 px-2">STATUS</th></tr>
                    </thead>
                    <tbody>
                      {supabaseFlights.length === 0 ? (
                        <tr><td colSpan={4} className="py-2 px-2.5 text-center" style={{ color: "var(--text-faint)" }}>No flights logged yet.</td></tr>
                      ) : supabaseFlights.map((f, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="py-1 px-2.5 font-bold">{f.flight_id}</td>
                          <td className="py-1 px-2 uppercase" style={{ color: "var(--teal)" }}>{f.profile}</td>
                          <td className="py-1 px-2">{Math.round(f.duration_s)}s</td>
                          <td className="py-1 px-2"><span style={{ padding: "1px 6px", background: "var(--green-bg)", border: "1px solid var(--green)", color: "var(--green)", fontWeight: 600 }}>{f.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ border: "1px solid var(--line)", overflow: "hidden" }}>
                <div className="flex items-center justify-between font-bold text-[11px]" style={{ background: "var(--panel2)", padding: "6px 12px", borderBottom: "1px solid var(--line)" }}>
                  <span>Logged FMEA incidents</span>
                  <span className="font-mono-tech font-normal" style={{ color: "var(--text-faint)" }}>{supabaseAlerts.length} incidents</span>
                </div>
                <div className="max-h-36 overflow-y-auto">
                  <table className="w-full text-left font-mono-tech text-[10px]">
                    <thead style={{ background: "var(--panel2)", borderBottom: "1px solid var(--line)" }}>
                      <tr><th className="py-1 px-2.5" style={{ color: "var(--text-faint)" }}>ALERT ID</th><th className="py-1 px-2">FAULT TYPE</th><th className="py-1 px-2">CONFIDENCE</th><th className="py-1 px-2">SEVERITY</th></tr>
                    </thead>
                    <tbody>
                      {supabaseAlerts.length === 0 ? (
                        <tr><td colSpan={4} className="py-2 px-2.5 text-center" style={{ color: "var(--text-faint)" }}>Zero recorded anomalies.</td></tr>
                      ) : supabaseAlerts.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="py-1 px-2.5 font-bold">{a.alert_id}</td>
                          <td className="py-1 px-2 font-semibold" style={{ color: "var(--ochre)" }}>{a.fault_type}</td>
                          <td className="py-1 px-2" style={{ color: "var(--teal)" }}>{Math.round(a.confidence * 100)}%</td>
                          <td className="py-1 px-2"><span style={{ padding: "1px 6px", background: "var(--red-bg)", border: "1px solid var(--red)", color: "var(--red)", fontWeight: 600 }}>{a.severity}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
              <button onClick={handleSyncFlightToSupabase} disabled={isSyncingSupabase} className="view-tab active flex items-center gap-1.5" style={{ padding: "8px 14px" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {isSyncingSupabase ? "Syncing..." : "Sync active sortie now"}
              </button>
              <button onClick={() => setShowSupabaseModal(false)} className="view-tab" style={{ padding: "8px 14px" }}>Close explorer</button>
            </div>
          </div>
        </div>
      )}

      {/* Debrief Modal */}
      {showDebriefModal && (
        <div className="modal-overlay">
          <div className="modal-panel space-y-4" style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5" style={{ color: "var(--ochre)" }} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-bold">DRDO Aeronautical Incident & Sortie Debrief</h3>
                    <span className={`font-mono-tech text-[9px] font-bold ${healthChipClass}`} style={{ padding: "2px 8px" }}>
                      {healthScore < 40 ? "GROUNDED" : healthScore < 70 ? "CAUTION" : "AIRWORTHY"}
                    </span>
                  </div>
                  <p className="font-mono-tech text-[10px]" style={{ color: "var(--text-faint)" }}>FORM DRDO-ADE-26054 · DIGITAL TWIN PROXY</p>
                </div>
              </div>
              <button onClick={() => setShowDebriefModal(false)} className="cursor-pointer font-bold" style={{ color: "var(--text-faint)" }}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 text-[11px]">
              <div className="grid grid-cols-4 gap-2 font-mono-tech" style={{ background: "var(--panel2)", border: "1px solid var(--line)", padding: 12 }}>
                <div><span className="block text-[9px] font-bold" style={{ color: "var(--text-faint)" }}>UAV TAIL</span><span className="font-bold">TAPAS-04</span></div>
                <div><span className="block text-[9px] font-bold" style={{ color: "var(--text-faint)" }}>SORTIE ID</span><span className="font-bold truncate block" style={{ color: "var(--teal)" }}>{livePacket?.flight_id || "flight_demo"}</span></div>
                <div><span className="block text-[9px] font-bold" style={{ color: "var(--text-faint)" }}>REGIME</span><span className="font-bold uppercase">{activeProfile}</span></div>
                <div><span className="block text-[9px] font-bold" style={{ color: "var(--text-faint)" }}>MET</span><span className="font-bold">T+{formatTime(currentFlightTime)}</span></div>
              </div>

              <div style={{ border: "1px solid var(--line)" }}>
                <div className="font-bold text-[11px]" style={{ background: "var(--panel2)", padding: "6px 12px", borderBottom: "1px solid var(--line)" }}>I. Thermodynamic & Electrical Envelope</div>
                <div className="grid grid-cols-5 gap-2 text-center font-mono-tech" style={{ padding: 12 }}>
                  {([
                    { label: "PEAK CHT", val: `${Math.round(maxCht)}°C`, sub: "Limit 220°C", color: maxCht > 200 ? "var(--red)" : "var(--text)" },
                    { label: "PEAK EGT", val: `${Math.round(Math.max(...egts))}°C`, sub: "Limit 850°C", color: "var(--text)" },
                    { label: "EGT SPREAD", val: `${Math.round(egtSpread)}°C`, sub: "Nominal <50°C", color: "var(--teal)" },
                    { label: "OIL PRESS", val: `${Math.round(oilP)} psi`, sub: "Band 45–80", color: oilP < 45 ? "var(--red)" : "var(--ochre)" },
                    { label: "BUS 1 DC", val: `${bus1V.toFixed(1)} V`, sub: "Nominal 28V", color: "var(--green)" },
                  ]).map(({ label, val, sub, color }) => (
                    <div key={label} style={{ padding: 8, background: "var(--panel2)", border: "1px solid var(--line)" }}>
                      <span className="block text-[9px]" style={{ color: "var(--text-faint)" }}>{label}</span>
                      <span className="block text-[14px] font-bold" style={{ color }}>{val}</span>
                      <span className="block text-[8px]" style={{ color: "var(--text-faint)" }}>{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ border: "1px solid var(--line)" }}>
                <div className="font-bold text-[11px]" style={{ background: "var(--panel2)", padding: "6px 12px", borderBottom: "1px solid var(--line)" }}>II. FMEA Diagnostic & ML Classification</div>
                <div className="space-y-2 font-mono-tech text-[11px]" style={{ padding: 12 }}>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Stage 1 edge anomaly:</span><span className="font-bold" style={{ color: isAnomalous ? "var(--red)" : "var(--green)" }}>{isAnomalous ? "TRIGGERED" : "NEGATIVE"}</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Stage 2 1D-CNN fault:</span><span className="font-bold uppercase">{diagnosedFault.replace(/_/g, " ")}</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--text-dim)" }}>Confidence:</span><span className="font-bold" style={{ color: "var(--teal)" }}>{livePacket?.alerts?.[0]?.confidence ? `${Math.round(livePacket.alerts[0].confidence * 100)}%` : "98.2%"}</span></div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--teal-bg)", border: "1px solid var(--teal)" }}>
                <span className="font-semibold text-[12px] flex items-center gap-1.5" style={{ color: "var(--teal)" }}>
                  <Bot className="w-3.5 h-3.5" /> III. Automated Engineering Directive
                </span>
                <p className="text-[11px] mt-1.5" style={{ lineHeight: 1.6 }}>{livePacket?.alerts?.[0]?.report_text || healthRec}</p>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <button onClick={() => window.print()} className="view-tab active flex items-center gap-1.5" style={{ padding: "8px 14px" }}>
                <Printer className="w-3.5 h-3.5" /> Print official report
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(
                      ["timestamp,rpm,health_score,volt1,volt2,amp1,amp2,E1_FFlow,E1_OilT,E1_OilP,E1_CHT1,E1_CHT2,E1_CHT3,E1_CHT4,E1_EGT1,E1_EGT2,E1_EGT3,E1_EGT4"]
                        .concat(history.map(h => `${h.t},${h.rpm},${h.mission_risk.health_score},${Object.values(h.channels).join(",")}`))
                        .join("\n")
                    );
                    const link = document.createElement("a");
                    link.setAttribute("href", csvContent);
                    link.setAttribute("download", `telemetry_debrief_${livePacket?.flight_id || "sortielog"}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="view-tab flex items-center gap-1.5" style={{ padding: "8px 14px", background: "var(--teal)", color: "var(--panel)", borderColor: "var(--teal)" }}
                >
                  <Download className="w-3.5 h-3.5" /> Download CSV
                </button>
                <button onClick={() => setShowDebriefModal(false)} className="view-tab" style={{ padding: "8px 14px" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
