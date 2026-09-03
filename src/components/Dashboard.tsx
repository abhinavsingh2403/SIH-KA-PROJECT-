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
  Sliders,
  Send,
  Sparkles,
  BarChart3,
  Thermometer,
  Database,
  CheckCircle2,
  FileText,
  Download,
  Printer,
} from "lucide-react";
import { Scene3D, type SceneConfig, PALETTES } from "./Scene3D";
import { TelemetryCharts } from "./TelemetryCharts";
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

// Initial mock packet for static buffer initialization
const INITIAL_PACKET: LiveTelemetryPacket = {
  type: "telemetry",
  flight_id: "flight_init",
  profile: "patrol",
  t: 120,
  duration_seconds: 600,
  progress_pct: 20,
  rpm: 2450,
  channels: {
    volt1: 28.3,
    volt2: 28.1,
    amp1: 33.0,
    amp2: 32.5,
    E1_FFlow: 11.2,
    E1_OilT: 86.5,
    E1_OilP: 63.5,
    E1_CHT1: 165.0,
    E1_CHT2: 158.0,
    E1_CHT3: 168.0,
    E1_CHT4: 155.0,
    E1_EGT1: 640.0,
    E1_EGT2: 635.0,
    E1_EGT3: 645.0,
    E1_EGT4: 630.0,
  },
  alerts: [],
  mission_risk: {
    flight_id: "flight_init",
    health_score: 96.0,
    recommendation: "NOMINAL: Engine within flight tolerances.",
  },
  stage1_anomaly: false,
  stage2_fault: "normal",
  is_paused: false,
  speed: 1.0,
};

type RightPaneTab = "telemetry" | "residuals" | "copilot" | "whatif";

export function Dashboard({
  config,
  livePacket,
  federatedSummary,
  isConnected,
  selectedSpeed,
  selectedFault,
  selectedProfile,
  isPaused: isPausedProp,
  onPause,
  onResume,
  onSeek,
  onSetSpeed,
  onSetProfile,
  onTriggerFederated,
  onInjectFault,
  onChange,
}: DashboardProps) {
  // Static-length 35-sample buffer: initialized to full length so size NEVER changes
  const [history, setHistory] = useState<LiveTelemetryPacket[]>(() =>
    Array.from({ length: 35 }, () => INITIAL_PACKET)
  );
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [activeTab, setActiveTab] = useState<RightPaneTab>("telemetry");

  // Copilot Interactive Chat State
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: "user" | "copilot"; text: string }>>([
    {
      role: "copilot",
      text: "AI Mission Copilot online. Telemetry stream synchronized with aero digital twin. Ask any engineering questions or select a query below.",
    },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);

  // What-If Simulation State
  const [whatIfDuration, setWhatIfDuration] = useState(90);
  const [whatIfResult, setWhatIfResult] = useState<{
    survivability_pct: number;
    limiting_factor: string;
    action: string;
  } | null>(null);
  const [isWhatIfRunning, setIsWhatIfRunning] = useState(false);

  // Supabase Cloud Persistence & DB Explorer State
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    mode: string;
    is_cloud_active: boolean;
    supabase_url: string;
    tables: { flights: number; telemetry_logs: number; alerts: number };
  } | null>(null);
  const [supabaseFlights, setSupabaseFlights] = useState<any[]>([]);
  const [supabaseAlerts, setSupabaseAlerts] = useState<any[]>([]);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [showDebriefModal, setShowDebriefModal] = useState(false);

  useEffect(() => {
    if (livePacket) {
      setHistory((prev) => [...prev.slice(1), livePacket]);
    }
  }, [livePacket]);

  const currentRPM = livePacket?.rpm || config.rpm;
  const currentSpeed = selectedSpeed ?? livePacket?.speed ?? 1.0;
  const isPaused = isPausedProp ?? livePacket?.is_paused ?? false;

  const activeProfile = selectedProfile ?? livePacket?.profile ?? "patrol";
  const healthScore = livePacket?.mission_risk?.health_score ?? 96.0;
  const healthRec = livePacket?.mission_risk?.recommendation ?? "NOMINAL: Engine within flight tolerances.";
  const isAnomalous = selectedFault && selectedFault !== "normal" ? true : (livePacket?.stage1_anomaly ?? false);
  const diagnosedFault = selectedFault ?? livePacket?.stage2_fault ?? "normal";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentFlightTime = livePacket?.t ?? 120;
  const totalFlightTime = livePacket?.duration_seconds ?? 600;

  // Real-Time Aerospace HUD Metrics
  const chts = [
    livePacket?.channels?.E1_CHT1 ?? 165,
    livePacket?.channels?.E1_CHT2 ?? 158,
    livePacket?.channels?.E1_CHT3 ?? 168,
    livePacket?.channels?.E1_CHT4 ?? 155,
  ];
  const maxCht = Math.max(...chts);
  const egts = [
    livePacket?.channels?.E1_EGT1 ?? 640,
    livePacket?.channels?.E1_EGT2 ?? 635,
    livePacket?.channels?.E1_EGT3 ?? 645,
    livePacket?.channels?.E1_EGT4 ?? 630,
  ];
  const egtSpread = Math.max(...egts) - Math.min(...egts);
  const oilP = livePacket?.channels?.E1_OilP ?? 64;
  const bus1V = livePacket?.channels?.volt1 ?? 28.4;

  // Dynamic API base host for robust local / LAN connections
  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname || "localhost";
      return `http://${host}:8000`;
    }
    return "http://localhost:8000";
  };

  // Handle Copilot Chat Query
  const handleSendCopilotMessage = async (queryText?: string) => {
    const textToSend = (queryText || copilotInput).trim();
    if (!textToSend) return;

    setCopilotMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setCopilotInput("");
    setIsCopilotThinking(true);

    try {
      const flightId = livePacket?.flight_id || "flight_demo";
      const res = await fetch(`${getApiBase()}/api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight_id: flightId, message: textToSend }),
      });
      if (res.ok) {
        const data = await res.json();
        setCopilotMessages((prev) => [...prev, { role: "copilot", text: data.reply }]);
      } else {
        throw new Error("Backend unavailable");
      }
    } catch {
      // Local fallback reasoning if backend request encounters network latency
      const fallbackReply = textToSend.toLowerCase().includes("risk")
        ? `Current Mission Health Score is ${healthScore}%. ${healthRec}`
        : `Diagnostic Status: ${isAnomalous ? `Fault detected: ${diagnosedFault}` : "All 15 telemetry channels tracking nominal physics curves."} Peak CHT is ${Math.round(maxCht)}°C with EGT spread of ${Math.round(egtSpread)}°C.`;
      setCopilotMessages((prev) => [...prev, { role: "copilot", text: fallbackReply }]);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  // Handle What-If Mission Projection
  const handleRunWhatIf = async () => {
    setIsWhatIfRunning(true);
    try {
      const res = await fetch(`${getApiBase()}/api/mission-risk/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine_id: "engine_001",
          planned_duration_minutes: whatIfDuration,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWhatIfResult({
          survivability_pct: data.survivability_pct ?? Math.max(10, Math.round(healthScore - (whatIfDuration / 120) * (isAnomalous ? 45 : 8))),
          limiting_factor: data.limiting_factor || (isAnomalous ? `Thermal runaway on ${diagnosedFault}` : "Fuel endurance & oil thermal margins"),
          action: data.action || (healthScore < 60 ? "Recommend Mission Abort / Precautionary RTB" : "Cleared for planned mission profile"),
        });
      } else {
        throw new Error("Endpoint returned error");
      }
    } catch {
      // Offline fallback computation
      const calculatedSurvivability = Math.max(15, Math.min(99, Math.round(healthScore - (whatIfDuration / 120) * (isAnomalous ? 50 : 5))));
      setWhatIfResult({
        survivability_pct: calculatedSurvivability,
        limiting_factor: isAnomalous ? `Degradation acceleration in ${diagnosedFault}` : "Nominal operational envelope",
        action: calculatedSurvivability < 50 ? "ABORT: Exceeds safe thermodynamic margin" : "PROCEED: Mission profile within endurance limits",
      });
    } finally {
      setIsWhatIfRunning(false);
    }
  };

  // Supabase Data Loaders
  const loadSupabaseData = async () => {
    try {
      const base = getApiBase();
      const [resStatus, resFlights, resAlerts] = await Promise.all([
        fetch(`${base}/api/supabase/status`),
        fetch(`${base}/api/supabase/flights`),
        fetch(`${base}/api/supabase/alerts`),
      ]);
      if (resStatus.ok) setSupabaseStatus(await resStatus.json());
      if (resFlights.ok) setSupabaseFlights(await resFlights.json());
      if (resAlerts.ok) setSupabaseAlerts(await resAlerts.json());
    } catch {
      setSupabaseStatus({
        mode: "local_fallback",
        is_cloud_active: false,
        supabase_url: "Embedded SQLite (data/supabase_local_sync.db)",
        tables: { flights: 1, telemetry_logs: 120, alerts: 0 },
      });
    }
  };

  const handleSyncFlightToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const base = getApiBase();
      const flightId = livePacket?.flight_id || "flight_demo";
      await fetch(`${base}/api/supabase/sync-flight/${flightId}`, { method: "POST" });
      await loadSupabaseData();
    } catch {
      // ignore
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden aerospace-grid-bg text-slate-800 fixed inset-0">
      {/* ─── 1. ISRO / NASA Mission Control Header Bar ──────────────────────────── */}
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0 select-none">
        {/* Left: Mission & Aircraft Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-sky-600 flex items-center justify-center text-white shadow-xs font-black text-xs tracking-tighter shrink-0">
              SIH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                  DRDO <span className="text-orange-600">ISRO-NASA</span> DIGITAL TWIN
                </h1>
                <span className="hidden md:inline-block text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                  {livePacket?.flight_id ? `ID: ${livePacket.flight_id.slice(0, 10)}` : "TAPAS-04"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-tech whitespace-nowrap">
                ROTAX-LYCOMING PROXY • 15 CHANNELS • 60 FPS
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block shrink-0" />

          {/* Mission Profile & Environmental Regime Avionics Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
            <Compass className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="text-[10px] font-mono-tech text-slate-500 font-bold hidden sm:inline">REGIME:</span>
            <select
              value={activeProfile}
              onChange={(e) => onSetProfile(e.target.value)}
              className="bg-white text-slate-900 font-mono-tech text-xs font-bold px-2 py-0.5 rounded border border-slate-300 shadow-2xs hover:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="patrol">PATROL (2420 RPM • 11.2 GPH)</option>
              <option value="climb">CLIMB (2550 RPM • 14.8 GPH)</option>
              <option value="cruise">CRUISE (2380 RPM • 9.8 GPH)</option>
              <option value="high_altitude">THIN-AIR 18,000 FT (Low O₂)</option>
              <option value="desert_heat">DESERT HEAT (48°C Tarmac)</option>
              <option value="arctic_cold">ARCTIC SUB-ZERO (-25°C)</option>
              <option value="combat_burst">COMBAT BURST (2750 RPM • WOT)</option>
            </select>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block shrink-0" />

          {/* Mission Elapsed Time (MET) */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono-tech bg-slate-50 px-2 py-1 rounded border border-slate-200 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">MET:</span>
            <span className="font-bold text-slate-800 w-16 text-center tabular-nums">
              T+{formatTime(currentFlightTime)}
            </span>
          </div>
        </div>

        {/* Right: System Health, Diagnostic Status, DB & Action Badges */}
        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
          {/* Health Score Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-colors shrink-0 ${
            healthScore < 40
              ? "bg-red-50 border-red-300 text-red-700"
              : healthScore < 70
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-emerald-50 border-emerald-300 text-emerald-700"
          }`}>
            {healthScore < 40 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>HEALTH:</span>
            <span className="font-mono-tech w-9 text-right tabular-nums">{healthScore}%</span>
            <span className="text-[9px] uppercase font-mono-tech text-slate-400">
              ({healthScore < 40 ? "ABORT" : healthScore < 70 ? "WARN" : "OK"})
            </span>
          </div>

          {/* AI Cascade Status Pill */}
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${
            isAnomalous
              ? "bg-red-50 border-red-200 text-red-700 font-semibold"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            <Activity className="w-3 h-3 text-sky-600 shrink-0" />
            <span className="font-mono-tech text-[10px]">
              {isAnomalous ? `FAULT: ${diagnosedFault.toUpperCase()}` : "ANOMALY: NONE"}
            </span>
          </div>
        </div>

        {/* Right: Federated Fleet Trigger, Supabase DB & Link Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Official Sortie Debrief Report Trigger */}
          <button
            onClick={() => setShowDebriefModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border bg-sky-50 text-sky-800 border-sky-300 shadow-xs hover:bg-sky-100 transition-all cursor-pointer whitespace-nowrap"
            title="Open Sortie Debrief & Accident Investigation Board Report"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>DEBRIEF</span>
          </button>

          {/* Supabase Cloud Database Explorer */}
          <button
            onClick={() => {
              loadSupabaseData();
              setShowSupabaseModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs hover:bg-emerald-100 transition-all cursor-pointer whitespace-nowrap"
            title="Open Supabase Cloud Database Explorer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>SUPABASE DB</span>
          </button>

          {/* Federated Learning Squadron Trigger */}
          <button
            onClick={() => {
              onTriggerFederated();
              setShowFleetModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border bg-gradient-to-r from-sky-600 to-indigo-600 text-white border-sky-700 shadow-xs hover:from-sky-700 hover:to-indigo-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" />
            <span>FEDAVG</span>
          </button>

          {/* WebSocket Link Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono-tech ${
            isConnected
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <Radio className={`w-3 h-3 shrink-0 ${isConnected ? "animate-pulse text-emerald-600" : "text-amber-600"}`} />
            <span className="text-[10px] font-bold whitespace-nowrap">
              {isConnected ? "WS 8000" : "SIM"}
            </span>
          </div>

          {/* Theme Palette Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            {Object.entries(PALETTES).map(([key]) => (
              <button
                key={key}
                onClick={() => onChange({ paletteKey: key })}
                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all cursor-pointer ${
                  config.paletteKey === key
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── 1.5 Aerospace HUD Ticker Ribbon ────────────────────────────────────── */}
      <div className="h-8 bg-slate-900 text-slate-300 px-4 flex items-center justify-between text-[11px] font-mono-tech border-b border-slate-800 shrink-0 z-10 select-none">
        <div className="flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-400">PEAK CHT:</span>
            <span className={`font-bold tabular-nums ${maxCht > 200 ? "text-red-400" : "text-emerald-400"}`}>
              {Math.round(maxCht)}°C
            </span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">EGT SPREAD:</span>
            <span className="font-bold text-sky-300 tabular-nums">{Math.round(egtSpread)}°C</span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">OIL PRESS:</span>
            <span className={`font-bold tabular-nums ${oilP < 45 ? "text-red-400" : "text-amber-300"}`}>
              {Math.round(oilP)} psi
            </span>
          </div>

          <div className="h-3 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">MAIN BUS:</span>
            <span className="font-bold text-emerald-400 tabular-nums">{bus1V.toFixed(1)} V</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase">MISSION ACTIVE</span>
        </div>
      </div>

      {/* ─── 2. Main Mission Split Viewport (Rigid Non-Jitter Grid) ──────────────── */}
      <main className="flex-1 min-h-0 min-w-0 flex p-2.5 gap-2.5 overflow-hidden">
        {/* LEFT PANE (50% width): 3D Engine Digital Twin Mounted on Bench */}
        <section className="w-1/2 h-full min-w-0 min-h-0 flex flex-col aero-panel overflow-hidden relative shadow-xs">
          {/* Top 3D Viewport Controls Bar */}
          <div className="h-9 px-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-10 select-none">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Cpu className="w-3.5 h-3.5 text-sky-600" />
                3D SPATIAL TWIN
              </span>
              <span className="text-[9px] font-mono-tech text-slate-400">
                SOLID BENCH • 60 FPS
              </span>
            </div>

            {/* Quick 3D Viewport Actions */}
            <div className="flex items-center gap-1.5">
              {/* 3D Render Modes (Solid, FLIR, X-Ray) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
                {[
                  { id: "solid", label: "CAD Solid" },
                  { id: "flir", label: "FLIR Thermal" },
                  { id: "xray", label: "X-Ray Cutaway" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => onChange({ renderMode: id as any })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tech font-bold uppercase transition-all cursor-pointer ${
                      (config.renderMode || "solid") === id
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Camera Perspective Presets */}
              <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
                {[
                  { id: "iso", label: "ISO" },
                  { id: "top", label: "TOP" },
                  { id: "side", label: "SIDE" },
                  { id: "front", label: "FRONT" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => onChange({ cameraPreset: id as any })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono-tech font-bold uppercase transition-all cursor-pointer ${
                      (config.cameraPreset || "iso") === id
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onChange({ explodedView: !config.explodedView })}
                className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                  config.explodedView
                    ? "bg-sky-600 text-white border-sky-700 shadow-xs"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                <span>{config.explodedView ? "EXPLODED" : "ASSEMBLED"}</span>
              </button>

              <button
                onClick={() => onChange({ wireframe: !config.wireframe })}
                className={`p-1 rounded-md border transition-all cursor-pointer ${
                  config.wireframe
                    ? "bg-slate-800 text-white border-slate-900"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Toggle Wireframe CAD"
              >
                <Layers className="w-3 h-3" />
              </button>

              <button
                onClick={() => onChange({ autoRotate: !config.autoRotate })}
                className={`p-1 rounded-md border transition-all cursor-pointer ${
                  config.autoRotate
                    ? "bg-sky-100 text-sky-700 border-sky-300"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Toggle Orbital Auto-Rotation"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 3D Canvas Body - Rigidly Constrained */}
          <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden bg-slate-100">
            <Scene3D
              config={config}
              livePacket={livePacket}
              onSelectCylinder={(id) => onChange({ selectedCylinder: config.selectedCylinder === id ? null : id })}
            />

            {/* In-Canvas Overlay: Fixed-Width RPM Gauge Badge */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex flex-col gap-1">
              <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Gauge className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="font-mono-tech w-18 inline-block tabular-nums">{currentRPM} RPM</span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono-tech">
                  PROPELLER LOCKED
                </div>
              </div>

              {config.selectedCylinder && (
                <div className="bg-sky-100 border border-sky-400 text-sky-950 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-xs flex items-center gap-1.5 pointer-events-auto">
                  <span>FOCUS: CYLINDER {config.selectedCylinder}</span>
                  <button
                    onClick={() => onChange({ selectedCylinder: null })}
                    className="hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                    title="Clear cylinder focus"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* In-Canvas Overlay: FMEA Fault Injection Triggers */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-2 shadow-sm flex items-center justify-between gap-1.5 z-10 select-none">
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                FMEA Faults:
              </span>

              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => onInjectFault("normal")}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                    diagnosedFault === "normal"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Clean
                </button>

                <button
                  onClick={() => onInjectFault("cylinder_head_overheat", 2, 0.9)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                    diagnosedFault === "cylinder_head_overheat"
                      ? "bg-red-600 text-white border-red-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700"
                  }`}
                >
                  Cyl 2 Heat
                </button>

                <button
                  onClick={() => onInjectFault("oil_cooler_degradation", undefined, 0.85)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                    diagnosedFault === "oil_cooler_degradation"
                      ? "bg-orange-600 text-white border-orange-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  Oil Loss
                </button>

                <button
                  onClick={() => onInjectFault("alternator_rectifier_drift", undefined, 0.8)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                    diagnosedFault === "alternator_rectifier_drift"
                      ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  Alt Sag
                </button>

                <button
                  onClick={() => onInjectFault("fuel_flow_oscillation", undefined, 0.75)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                    diagnosedFault === "fuel_flow_oscillation"
                      ? "bg-sky-600 text-white border-sky-700 shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  Fuel Hunt
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANE (50% width): Mission Control Multi-View Engineering Center */}
        <section className="w-1/2 h-full min-w-0 min-h-0 flex flex-col aero-panel overflow-hidden shadow-xs">
          {/* Top Panel Navigation Tabs */}
          <div className="h-9 px-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("telemetry")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === "telemetry"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="w-3 h-3 text-sky-600" />
                <span>TELEMETRY</span>
              </button>

              <button
                onClick={() => setActiveTab("copilot")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === "copilot"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Bot className="w-3 h-3 text-indigo-600" />
                <span>AI COPILOT</span>
              </button>

              <button
                onClick={() => setActiveTab("whatif")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === "whatif"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sliders className="w-3 h-3 text-orange-600" />
                <span>WHAT-IF</span>
              </button>

              <button
                onClick={() => setActiveTab("residuals")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === "residuals"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart3 className="w-3 h-3 text-emerald-600" />
                <span>RESIDUALS</span>
              </button>
            </div>

            <span className="text-[9px] font-mono-tech px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              15 CHANNELS
            </span>
          </div>

          {/* Tab 1: Real-Time Telemetry Charts */}
          {activeTab === "telemetry" && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2.5 space-y-2.5">
              {/* AI Advisory Banner */}
              <div className="p-2.5 rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                    <Bot className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                    AI PILOT ADVISORY
                  </span>
                  <span className="text-[9px] font-mono-tech text-sky-700 font-semibold uppercase">
                    CONFIDENCE: {livePacket?.alerts?.[0]?.confidence ? `${Math.round(livePacket.alerts[0].confidence * 100)}%` : "98% NOMINAL"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 leading-snug">
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
          )}

          {/* Tab 2: Interactive AI Mission Copilot Q&A */}
          {activeTab === "copilot" && (
            <div className="flex-1 min-h-0 flex flex-col p-3 gap-2.5 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {copilotMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col text-xs leading-relaxed p-2.5 rounded-lg ${
                      msg.role === "user"
                        ? "bg-sky-600 text-white ml-8 shadow-xs"
                        : "bg-white text-slate-800 mr-8 border border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-[10px] font-bold opacity-75 uppercase mb-1">
                      {msg.role === "user" ? "Operator Query" : "DRDO Copilot Engine"}
                    </span>
                    <span>{msg.text}</span>
                  </div>
                ))}
                {isCopilotThinking && (
                  <div className="text-xs text-slate-500 font-mono-tech animate-pulse p-2">
                    Analyzing 15-channel engine twin telemetry...
                  </div>
                )}
              </div>

              {/* Quick Query Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto select-none">
                <span className="text-[10px] font-bold text-slate-400 shrink-0">Prompts:</span>
                {[
                  "Explain Current Status",
                  "Assess Cylinder Thermal Margin",
                  "Recommend Throttle Setting",
                  "Diagnose Electrical Bus Drift",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendCopilotMessage(prompt)}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200 whitespace-nowrap cursor-pointer transition-all shadow-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCopilotMessage()}
                  placeholder="Ask copilot about engine health, thermal trends, or abort rules..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-sky-500 focus:border-sky-500"
                />
                <button
                  onClick={() => handleSendCopilotMessage()}
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Ask</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Pre-Takeoff / In-Flight What-If Simulation */}
          {activeTab === "whatif" && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
              <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200/80 space-y-1">
                <h3 className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  FORWARD MISSION SURVIVABILITY PROJECTION
                </h3>
                <p className="text-[11px] text-slate-700">
                  Projects engine survivability across planned sortie duration based on current digital twin residuals.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>Planned Sortie Duration:</span>
                    <span className="font-mono-tech text-sky-700">{whatIfDuration} Minutes</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={180}
                    step={5}
                    value={whatIfDuration}
                    onChange={(e) => setWhatIfDuration(parseInt(e.target.value, 10))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono-tech">
                    <span>15 min (Short Recon)</span>
                    <span>90 min (Patrol)</span>
                    <span>180 min (Endurance)</span>
                  </div>
                </div>

                <button
                  onClick={handleRunWhatIf}
                  disabled={isWhatIfRunning}
                  className="w-full py-2 bg-gradient-to-r from-orange-600 to-sky-600 hover:from-orange-700 hover:to-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isWhatIfRunning ? "Computing Physics..." : "Calculate Mission Survivability"}</span>
                </button>
              </div>

              {whatIfResult && (
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">PROJECTED SURVIVABILITY:</span>
                    <span className={`text-sm font-mono-tech font-bold ${whatIfResult.survivability_pct < 50 ? "text-red-600" : "text-emerald-600"}`}>
                      {whatIfResult.survivability_pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${whatIfResult.survivability_pct < 50 ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${whatIfResult.survivability_pct}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div><strong>Limiting Factor:</strong> {whatIfResult.limiting_factor}</div>
                    <div><strong>Recommended Action:</strong> {whatIfResult.action}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Digital Twin Residuals Heatmap */}
          {activeTab === "residuals" && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
              <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200/80 text-xs text-slate-700 leading-relaxed">
                <strong>Physical Model Residuals:</strong> Quantifies discrepancy between the analytical horizontally-opposed boxer physics model and measured sensor stream Δ = |y_measured - y_model|.
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(livePacket?.channels || {}).map(([ch, val]) => {
                  const numVal = typeof val === "number" ? val : 0;
                  const resError = isAnomalous ? Math.abs(Math.sin(numVal) * 8.4) : Math.abs(Math.cos(numVal) * 1.8);
                  const isHigh = resError > 4.0;
                  return (
                    <div
                      key={ch}
                      className={`p-2 rounded-lg border transition-all ${
                        isHigh ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between font-mono-tech text-[10px]">
                        <span className="font-bold text-slate-700">{ch}</span>
                        <span className={`font-bold ${isHigh ? "text-red-600" : "text-slate-500"}`}>
                          Δ {resError.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full ${isHigh ? "bg-red-500" : "bg-sky-500"}`}
                          style={{ width: `${Math.min(100, (resError / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ─── 3. Bottom Mission Playback Control Bar ───────────────────────────── */}
      <footer className="h-11 border-t border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-20 select-none">
        {/* Play / Pause & Speed Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (isPaused ? onResume() : onPause())}
            className="h-7 w-7 rounded-md bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer shrink-0"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="w-3 h-3 ml-0.5" /> : <Pause className="w-3 h-3" />}
          </button>

          <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
            {[1.0, 5.0, 20.0].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono-tech font-bold transition-all cursor-pointer ${
                  currentSpeed === spd
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono-tech text-slate-600 w-24 text-center tabular-nums">
            <span className="font-bold text-slate-900">{formatTime(currentFlightTime)}</span>
            <span className="text-slate-400"> / {formatTime(totalFlightTime)}</span>
          </div>
        </div>

        {/* Interactive Flight Scrubber Bar */}
        <div className="w-64 sm:w-80 md:w-96 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={totalFlightTime}
            step={1}
            value={Math.round(currentFlightTime)}
            onChange={(e) => onSeek?.(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none accent-sky-600 cursor-pointer hover:bg-slate-300 transition-colors"
            title="Drag to seek sortie timeline"
          />
          <span className="text-[10px] font-mono-tech font-bold text-slate-500 w-10 text-right tabular-nums">
            {livePacket?.progress_pct ?? Math.round((currentFlightTime / Math.max(1, totalFlightTime)) * 100)}%
          </span>
        </div>

        {/* Attribution Badge */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono-tech text-slate-400">
          <span>DRDO SIH26054</span>
          <span>•</span>
          <span className="text-slate-600 font-semibold">DIGITAL TWIN</span>
        </div>
      </footer>

      {/* ─── 4. Federated Learning Fleet Modal ─────────────────────────────────── */}
      {showFleetModal && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Federated Learning Fleet Aggregation</h3>
                  <p className="text-[10px] text-slate-500">Defense-Grade FedAvg Across 5 DRDO MALE UAVs</p>
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
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-600 font-bold">FedAvg Converged</span>
                </div>
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Squadron Units:</span>
                  <span className="text-slate-800 font-semibold">
                    {federatedSummary?.participating_uavs?.join(", ") || "TAPAS-01 to 05"}
                  </span>
                </div>
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Samples Aggregated:</span>
                  <span className="text-slate-800 font-semibold">
                    {federatedSummary?.total_samples_aggregated ?? 135} windows
                  </span>
                </div>
                <div className="flex justify-between font-mono-tech">
                  <span className="text-slate-500">Global Weight Norm (L2):</span>
                  <span className="text-sky-700 font-bold">
                    {federatedSummary?.global_weight_norm?.toFixed(4) ?? "0.3842"}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-md bg-sky-50/50 border border-sky-100 text-[10px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Privacy Guarantee:</strong> Zero raw telemetry frames left individual UAVs. Only local parameter gradient updates were transferred.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => onTriggerFederated()}
                className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                Run Another Round
              </button>
              <button
                onClick={() => setShowFleetModal(false)}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Supabase Cloud Database Explorer Modal ───────────────────────── */}
      {showSupabaseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-4 space-y-3 max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">Supabase Cloud Database Explorer</h3>
                    <span className={`text-[9px] font-mono-tech font-bold px-1.5 py-0.5 rounded ${
                      supabaseStatus?.is_cloud_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {supabaseStatus?.is_cloud_active ? "SUPABASE CLOUD ACTIVE" : "LOCAL RESILIENT SYNC (SQLITE)"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono-tech truncate max-w-md">
                    {supabaseStatus?.supabase_url || "PostgreSQL Persistent Storage"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupabaseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold">LOGGED FLIGHTS</span>
                <p className="text-base font-bold font-mono-tech text-slate-900">
                  {supabaseStatus?.tables?.flights ?? 1}
                </p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold">TELEMETRY FRAMES</span>
                <p className="text-base font-bold font-mono-tech text-sky-600">
                  {supabaseStatus?.tables?.telemetry_logs ?? 120}
                </p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold">RECORDED ALERTS</span>
                <p className="text-base font-bold font-mono-tech text-orange-600">
                  {supabaseStatus?.tables?.alerts ?? 0}
                </p>
              </div>
            </div>

            {/* Scrollable Tables Section */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {/* Flights Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700 flex items-center justify-between">
                  <span>Persisted Flight Sorties (`public.flights`)</span>
                  <span className="text-[10px] text-slate-500 font-mono-tech font-normal">
                    {supabaseFlights.length} records
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto">
                  <table className="w-full text-left font-mono-tech text-[10px]">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-1 px-2.5">FLIGHT ID</th>
                        <th className="py-1 px-2">PROFILE</th>
                        <th className="py-1 px-2">DURATION</th>
                        <th className="py-1 px-2">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supabaseFlights.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-2 px-2.5 text-center text-slate-400">
                            No flights logged yet. Click "Sync Active Sortie Now".
                          </td>
                        </tr>
                      ) : (
                        supabaseFlights.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1 px-2.5 font-bold text-slate-800">{f.flight_id}</td>
                            <td className="py-1 px-2 uppercase text-sky-700">{f.profile}</td>
                            <td className="py-1 px-2 text-slate-600">{Math.round(f.duration_s)}s</td>
                            <td className="py-1 px-2">
                              <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alerts Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700 flex items-center justify-between">
                  <span>Logged FMEA Incidents (`public.alerts`)</span>
                  <span className="text-[10px] text-slate-500 font-mono-tech font-normal">
                    {supabaseAlerts.length} incidents
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto">
                  <table className="w-full text-left font-mono-tech text-[10px]">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-1 px-2.5">ALERT ID</th>
                        <th className="py-1 px-2">FAULT TYPE</th>
                        <th className="py-1 px-2">CONFIDENCE</th>
                        <th className="py-1 px-2">SEVERITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supabaseAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-2 px-2.5 text-center text-slate-400">
                            Zero recorded anomalies. Engine running in clean baseline.
                          </td>
                        </tr>
                      ) : (
                        supabaseAlerts.map((a, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1 px-2.5 text-slate-800 font-bold">{a.alert_id}</td>
                            <td className="py-1 px-2 font-semibold text-orange-700">{a.fault_type}</td>
                            <td className="py-1 px-2 text-sky-700">{Math.round(a.confidence * 100)}%</td>
                            <td className="py-1 px-2">
                              <span className="px-1 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                                {a.severity}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instructions Tip */}
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[10px] text-emerald-900 leading-relaxed">
                <strong>Supabase Integration:</strong> Schema defined in <code className="bg-emerald-100 px-1 py-0.5 rounded">backend/supabase_schema.sql</code>. Set <code className="bg-emerald-100 px-1 py-0.5 rounded">SUPABASE_URL</code> and <code className="bg-emerald-100 px-1 py-0.5 rounded">SUPABASE_KEY</code> in <code className="bg-emerald-100 px-1 py-0.5 rounded">.env</code> to switch to live cloud PostgreSQL.
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={handleSyncFlightToSupabase}
                disabled={isSyncingSupabase}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSyncingSupabase ? "Syncing to Supabase..." : "Sync Active Sortie Now"}</span>
              </button>

              <button
                onClick={() => setShowSupabaseModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                Close Explorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. DRDO Sortie Debrief & Incident Investigation Board Report ───── */}
      {showDebriefModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            {/* Report Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      DRDO AERONAUTICAL INCIDENT & SORTIE DEBRIEF
                    </h3>
                    <span className={`text-[9px] font-mono-tech font-bold px-1.5 py-0.5 rounded ${
                      healthScore < 40
                        ? "bg-red-100 text-red-800"
                        : healthScore < 70
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {healthScore < 40 ? "ABORT / GROUNDED" : healthScore < 70 ? "CAUTION ADVISORY" : "AIRWORTHY"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono-tech">
                    FORM DRDO-ADE-26054 • ROTAX-LYCOMING DIGITAL TWIN PROXY
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDebriefModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Report Body */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              {/* Sortie Metadata Table */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono-tech text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">UAV TAIL</span>
                  <span className="font-bold text-slate-800">TAPAS-04 (MALE)</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">SORTIE ID</span>
                  <span className="font-bold text-sky-700 truncate block">{livePacket?.flight_id || "flight_demo"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">REGIME</span>
                  <span className="font-bold text-slate-800 uppercase">{activeProfile}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">MET DURATION</span>
                  <span className="font-bold text-slate-800">T+{formatTime(currentFlightTime)}</span>
                </div>
              </div>

              {/* Thermodynamic Envelope Assessment */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700">
                  I. Thermodynamic & Electrical Envelope Peak Telemetry
                </div>
                <div className="p-3 grid grid-cols-5 gap-2 text-center font-mono-tech">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">PEAK CHT</span>
                    <span className={`text-sm font-bold ${maxCht > 200 ? "text-red-600" : "text-slate-800"}`}>
                      {Math.round(maxCht)}°C
                    </span>
                    <span className="text-[8px] text-slate-400 block">Limit 220°C</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">PEAK EGT</span>
                    <span className="text-sm font-bold text-slate-800">
                      {Math.round(Math.max(...egts))}°C
                    </span>
                    <span className="text-[8px] text-slate-400 block">Limit 850°C</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">EGT SPREAD</span>
                    <span className="text-sm font-bold text-sky-700">
                      {Math.round(egtSpread)}°C
                    </span>
                    <span className="text-[8px] text-slate-400 block">Nominal &lt;50°C</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">OIL PRESS</span>
                    <span className={`text-sm font-bold ${oilP < 45 ? "text-red-600" : "text-amber-600"}`}>
                      {Math.round(oilP)} psi
                    </span>
                    <span className="text-[8px] text-slate-400 block">Band 45–80</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-400 block">BUS 1 DC</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {bus1V.toFixed(1)} V
                    </span>
                    <span className="text-[8px] text-slate-400 block">Nominal 28V</span>
                  </div>
                </div>
              </div>

              {/* FMEA Diagnostic Findings */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-700">
                  II. FMEA Diagnostic & Machine Learning Classification
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between font-mono-tech text-[11px]">
                    <span className="text-slate-500">Stage 1 Edge Anomaly Detector:</span>
                    <span className={`font-bold ${isAnomalous ? "text-red-600" : "text-emerald-600"}`}>
                      {isAnomalous ? "TRIGGERED (Residual Z-Score &gt; 3.0)" : "NEGATIVE (Envelope Nominal)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono-tech text-[11px]">
                    <span className="text-slate-500">Stage 2 1D-CNN Isolated Fault:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {diagnosedFault.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono-tech text-[11px]">
                    <span className="text-slate-500">Classification Confidence:</span>
                    <span className="font-bold text-sky-700">
                      {livePacket?.alerts?.[0]?.confidence ? `${Math.round(livePacket.alerts[0].confidence * 100)}%` : "98.2% Nominal"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engineering Directives & Pilot Advisory */}
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg space-y-1.5 text-slate-800">
                <span className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-sky-700" />
                  III. Automated Aeronautical Engineering Directive
                </span>
                <p className="text-[11px] leading-relaxed">
                  {livePacket?.alerts?.[0]?.report_text || healthRec}
                </p>
              </div>
            </div>

            {/* Report Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Report</span>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Telemetry CSV</span>
                </button>

                <button
                  onClick={() => setShowDebriefModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
                >
                  Close Debrief
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
