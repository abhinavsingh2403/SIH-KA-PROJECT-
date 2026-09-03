import { useMemo } from "react";
import { type LiveTelemetryPacket, type SensorChannel } from "../types/telemetry";
import { Flame, Zap, Activity, Droplets, type LucideIcon } from "lucide-react";

interface TelemetryChartsProps {
  packet: LiveTelemetryPacket | null;
  history: LiveTelemetryPacket[];
  selectedCylinder: number | null;
  onSelectCylinder?: (id: number) => void;
}

// ─── Reusable Multi-line SVG Sparkline / Time-Series Chart ───────────────────────

interface SeriesConfig {
  key: SensorChannel;
  name: string;
  color: string;
  unit: string;
}

function MultiLineChart({
  title,
  subtitle,
  icon: Icon,
  series,
  history,
  minVal,
  maxVal,
  cautionThresh,
  criticalThresh,
  highlightKey,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  series: SeriesConfig[];
  history: LiveTelemetryPacket[];
  minVal: number;
  maxVal: number;
  cautionThresh?: number;
  criticalThresh?: number;
  highlightKey?: string | null;
}) {
  const width = 420;
  const height = 130;
  const padding = { top: 12, right: 12, bottom: 20, left: 36 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Generate SVG path for a specific sensor channel across history
  const paths = useMemo(() => {
    if (history.length < 2) return [];

    return series.map((s) => {
      const pts = history.map((pkt, idx) => {
        const x = padding.left + (idx / (history.length - 1)) * plotW;
        const rawVal = pkt.channels[s.key] ?? minVal;
        const clamped = Math.max(minVal, Math.min(maxVal, rawVal));
        const y = padding.top + plotH - ((clamped - minVal) / (maxVal - minVal)) * plotH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      return {
        key: s.key,
        name: s.name,
        color: s.color,
        d: `M ${pts.join(" L ")}`,
        currentVal: history[history.length - 1]?.channels[s.key] ?? minVal,
      };
    });
  }, [history, series, minVal, maxVal, plotW, plotH, padding.left, padding.top]);

  // Compute Y coordinate for threshold lines
  const cautionY = cautionThresh
    ? padding.top + plotH - ((cautionThresh - minVal) / (maxVal - minVal)) * plotH
    : null;
  const criticalY = criticalThresh
    ? padding.top + plotH - ((criticalThresh - minVal) / (maxVal - minVal)) * plotH
    : null;

  return (
    <div className="aero-panel p-3.5 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-sky-50 text-sky-600 border border-sky-100">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Live Channel Badges */}
        <div className="flex items-center gap-2">
          {paths.map((p) => {
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <div
                key={p.key}
                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                  isHighlighted
                    ? "bg-sky-50 border-sky-300 font-bold"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-slate-500">{p.name.split(" ")[0]}</span>
                <span className="font-mono-tech font-bold text-slate-800">
                  {Math.round(p.currentVal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
            const y = padding.top + plotH * (1 - frac);
            const val = Math.round(minVal + frac * (maxVal - minVal));
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  className="chart-grid-line"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono-tech"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Caution Threshold Line */}
          {cautionY && (
            <g>
              <line
                x1={padding.left}
                y1={cautionY}
                x2={width - padding.right}
                y2={cautionY}
                className="chart-threshold-caution"
              />
              <text
                x={width - padding.right}
                y={cautionY - 3}
                textAnchor="end"
                className="text-[8px] fill-amber-500 font-bold"
              >
                CAUTION ({cautionThresh})
              </text>
            </g>
          )}

          {/* Critical Threshold Line */}
          {criticalY && (
            <g>
              <line
                x1={padding.left}
                y1={criticalY}
                x2={width - padding.right}
                y2={criticalY}
                className="chart-threshold-critical"
              />
              <text
                x={width - padding.right}
                y={criticalY - 3}
                textAnchor="end"
                className="text-[8px] fill-red-500 font-bold"
              >
                CRITICAL ({criticalThresh})
              </text>
            </g>
          )}

          {/* Data Series Paths */}
          {paths.map((p) => {
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={isHighlighted ? 2.5 : 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={highlightKey && !isHighlighted ? 0.35 : 1.0}
              />
            );
          })}

          {/* X-axis base */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <text
            x={width - padding.right}
            y={height - 5}
            textAnchor="end"
            className="text-[9px] fill-slate-400 font-mono-tech"
          >
            T (sec) ──▶
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── Dual Electrical Bus Gauge Strip ────────────────────────────────────────────

function ElectricalBusSection({ packet }: { packet: LiveTelemetryPacket | null }) {
  const v1 = packet?.channels?.volt1 ?? 28.4;
  const v2 = packet?.channels?.volt2 ?? 28.2;
  const a1 = packet?.channels?.amp1 ?? 32.5;
  const a2 = packet?.channels?.amp2 ?? 31.8;

  return (
    <div className="aero-panel p-3.5 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-100">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">28V DC Electrical Generation</h3>
            <p className="text-[10px] text-slate-400">Dual Alternator / Bus Load Distribution</p>
          </div>
        </div>
        <span className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
          AVIONICS POWER: NOMINAL
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Bus 1 */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">BUS 1 (PRIMARY)</span>
            <span className={`text-xs font-mono-tech font-bold ${v1 < 26 ? "text-red-600" : "text-sky-700"}`}>
              {v1.toFixed(1)} V
            </span>
          </div>
          {/* Voltage visual bar */}
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${v1 < 26 ? "bg-red-500" : "bg-sky-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, ((v1 - 22) / (32 - 22)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-tech">
            <span>Load: {Math.round(a1)} A</span>
            <span>24V - 30V Reg</span>
          </div>
        </div>

        {/* Bus 2 */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">BUS 2 (ESSENTIAL)</span>
            <span className={`text-xs font-mono-tech font-bold ${v2 < 26 ? "text-red-600" : "text-sky-700"}`}>
              {v2.toFixed(1)} V
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${v2 < 26 ? "bg-red-500" : "bg-sky-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, ((v2 - 22) / (32 - 22)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-tech">
            <span>Load: {Math.round(a2)} A</span>
            <span>24V - 30V Reg</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Telemetry Charts Suite Export ─────────────────────────────────────────

export function TelemetryCharts({
  packet,
  history,
  selectedCylinder,
  onSelectCylinder: _onSelectCylinder,
}: TelemetryChartsProps) {
  // CHT Series Definition
  const chtSeries: SeriesConfig[] = [
    { key: "E1_CHT1", name: "Cyl 1", color: "#0284c7", unit: "°C" },
    { key: "E1_CHT2", name: "Cyl 2", color: "#ea580c", unit: "°C" }, // Saffron
    { key: "E1_CHT3", name: "Cyl 3", color: "#059669", unit: "°C" }, // Emerald
    { key: "E1_CHT4", name: "Cyl 4", color: "#6366f1", unit: "°C" }, // Indigo
  ];

  // Oil Series Definition
  const oilSeries: SeriesConfig[] = [
    { key: "E1_OilT", name: "Oil Temp", color: "#dc2626", unit: "°C" },
    { key: "E1_OilP", name: "Oil Press", color: "#0284c7", unit: "psi" },
  ];

  // EGT Series Definition
  const egtSeries: SeriesConfig[] = [
    { key: "E1_EGT1", name: "EGT 1", color: "#0284c7", unit: "°C" },
    { key: "E1_EGT2", name: "EGT 2", color: "#ea580c", unit: "°C" },
    { key: "E1_EGT3", name: "EGT 3", color: "#059669", unit: "°C" },
    { key: "E1_EGT4", name: "EGT 4", color: "#6366f1", unit: "°C" },
  ];

  const highlightChannel = selectedCylinder ? `CHT${selectedCylinder}` : null;

  return (
    <div className="space-y-3 custom-scrollbar overflow-y-auto pr-1 pb-4">
      {/* 1. CHT 4-Cylinder Thermal Plot */}
      <MultiLineChart
        title="Cylinder Head Temperature (CHT1 - CHT4)"
        subtitle="Lycoming IO-360 Cylinder Head Thermal Gradient"
        icon={Flame}
        series={chtSeries}
        history={history}
        minVal={100}
        maxVal={260}
        cautionThresh={200}
        criticalThresh={230}
        highlightKey={highlightChannel}
      />

      {/* 2. Oil System Coupled Dynamics */}
      <MultiLineChart
        title="Engine Lubrication & Oil Dynamics"
        subtitle="E1_OilT (°C) vs E1_OilP (psi) Viscosity Coupling"
        icon={Droplets}
        series={oilSeries}
        history={history}
        minVal={30}
        maxVal={140}
        cautionThresh={115}
      />

      {/* 3. EGT Exhaust Gas Temperatures */}
      <MultiLineChart
        title="Exhaust Gas Temperature (EGT1 - EGT4)"
        subtitle="Combustion Efficiency & Mixture Distribution"
        icon={Activity}
        series={egtSeries}
        history={history}
        minVal={400}
        maxVal={850}
        cautionThresh={760}
      />

      {/* 4. Dual 28V DC Electrical Bus */}
      <ElectricalBusSection packet={packet} />
    </div>
  );
}
