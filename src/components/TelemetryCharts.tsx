import { useState, useMemo, useRef } from "react";
import { type LiveTelemetryPacket, type SensorChannel } from "../types/telemetry";
import { Flame, Zap, Activity, Droplets, type LucideIcon } from "lucide-react";

interface TelemetryChartsProps {
  packet: LiveTelemetryPacket | null;
  history: LiveTelemetryPacket[];
  selectedCylinder: number | null;
  onSelectCylinder?: (id: number) => void;
}

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
  onBadgeClick,
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
  onBadgeClick?: (key: string) => void;
}) {
  const width = 420;
  const height = 110;
  const padding = { top: 10, right: 12, bottom: 18, left: 34 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a fixed buffer length of 35 points to eliminate stretching and shaking
  const paths = useMemo(() => {
    if (history.length < 2) return [];

    return series.map((s) => {
      const pts: string[] = [];
      const len = history.length;

      for (let i = 0; i < len; i++) {
        const pkt = history[i];
        const x = padding.left + (i / Math.max(1, len - 1)) * plotW;
        const rawVal = pkt?.channels?.[s.key] ?? minVal;
        const clamped = Math.max(minVal, Math.min(maxVal, rawVal));
        const y = padding.top + plotH - ((clamped - minVal) / (maxVal - minVal)) * plotH;
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }

      const lastVal = history[history.length - 1]?.channels?.[s.key] ?? minVal;
      const hoveredVal = hoverIndex !== null && history[hoverIndex]
        ? history[hoverIndex]?.channels?.[s.key] ?? lastVal
        : lastVal;

      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const bottomY = (padding.top + plotH).toFixed(1);
      const areaPath = `M ${pts.join(" L ")} L ${lastPt.split(",")[0]},${bottomY} L ${firstPt.split(",")[0]},${bottomY} Z`;

      return {
        key: s.key,
        name: s.name,
        color: s.color,
        d: `M ${pts.join(" L ")}`,
        areaD: areaPath,
        currentVal: hoveredVal,
      };
    });
  }, [history, series, minVal, maxVal, plotW, plotH, padding.left, padding.top, hoverIndex]);

  const cautionY = cautionThresh
    ? padding.top + plotH - ((cautionThresh - minVal) / (maxVal - minVal)) * plotH
    : null;
  const criticalY = criticalThresh
    ? padding.top + plotH - ((criticalThresh - minVal) / (maxVal - minVal)) * plotH
    : null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || history.length < 2) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scale = width / rect.width;
    const svgX = clientX * scale;

    const normX = (svgX - padding.left) / plotW;
    const clampedNorm = Math.max(0, Math.min(1, normX));
    const idx = Math.round(clampedNorm * (history.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const crosshairX = hoverIndex !== null && history.length > 1
    ? padding.left + (hoverIndex / (history.length - 1)) * plotW
    : null;

  return (
    <div className="aero-panel p-3 space-y-2 select-none">
      {/* Header with Fixed-Width Indicators to prevent horizontal shaking */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-none">{title}</h3>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Live Channel Badges with fixed layout */}
        <div className="flex items-center gap-1.5">
          {paths.map((p) => {
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <button
                key={p.key}
                onClick={() => onBadgeClick?.(p.key)}
                className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  isHighlighted
                    ? "bg-sky-100 border-sky-400 font-bold text-sky-900 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-semibold text-slate-500">{p.name.split(" ")[0]}</span>
                <span className="font-mono-tech font-bold text-slate-900 w-7 text-right inline-block tabular-nums">
                  {Math.round(p.currentVal)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Canvas with FIXED height to prevent vertical jitter */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[105px] overflow-hidden bg-slate-50/50 rounded border border-slate-100 cursor-crosshair"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          preserveAspectRatio="none"
        >
          <defs>
            {paths.map((p) => (
              <linearGradient key={`grad-${p.key}`} id={`grad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={p.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Subtle Horizontal Gridlines */}
          {[0, 0.33, 0.66, 1.0].map((frac, i) => {
            const y = padding.top + plotH * (1 - frac);
            const val = Math.round(minVal + frac * (maxVal - minVal));
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <text
                  x={padding.left - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px] fill-slate-400 font-mono-tech tabular-nums"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Caution Threshold Line */}
          {cautionY !== null && (
            <line
              x1={padding.left}
              y1={cautionY}
              x2={width - padding.right}
              y2={cautionY}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Critical Threshold Line */}
          {criticalY !== null && (
            <line
              x1={padding.left}
              y1={criticalY}
              x2={width - padding.right}
              y2={criticalY}
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Area Fills under curves */}
          {paths.map((p) => {
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <path
                key={`area-${p.key}`}
                d={p.areaD}
                fill={`url(#grad-${p.key})`}
                opacity={highlightKey && !isHighlighted ? 0.05 : 1.0}
              />
            );
          })}

          {/* Data Series Line Paths */}
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
                opacity={highlightKey && !isHighlighted ? 0.25 : 1.0}
              />
            );
          })}

          {/* Interactive Hover Crosshair */}
          {crosshairX !== null && (
            <g>
              <line
                x1={crosshairX}
                y1={padding.top}
                x2={crosshairX}
                y2={padding.top + plotH}
                stroke="#0284c7"
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* X-axis baseline */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
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
    <div className="aero-panel p-3 space-y-2 select-none">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-none">28V DC Electrical Generation</h3>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Dual Alternator / Bus Load Distribution</p>
          </div>
        </div>
        <span className="text-[9px] font-mono-tech px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
          28V REGULATED
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Bus 1 */}
        <div className="p-2 rounded bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700">BUS 1 (PRIMARY)</span>
            <span className={`text-xs font-mono-tech font-bold tabular-nums ${v1 < 26 ? "text-red-600" : "text-sky-700"}`}>
              {v1.toFixed(1)} V
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${v1 < 26 ? "bg-red-500" : "bg-sky-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, ((v1 - 22) / (32 - 22)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono-tech">
            <span>Load: {Math.round(a1)} A</span>
            <span>24 - 30V OK</span>
          </div>
        </div>

        {/* Bus 2 */}
        <div className="p-2 rounded bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700">BUS 2 (ESSENTIAL)</span>
            <span className={`text-xs font-mono-tech font-bold tabular-nums ${v2 < 26 ? "text-red-600" : "text-sky-700"}`}>
              {v2.toFixed(1)} V
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${v2 < 26 ? "bg-red-500" : "bg-sky-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, ((v2 - 22) / (32 - 22)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono-tech">
            <span>Load: {Math.round(a2)} A</span>
            <span>24 - 30V OK</span>
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
  onSelectCylinder,
}: TelemetryChartsProps) {
  const chtSeries: SeriesConfig[] = [
    { key: "E1_CHT1", name: "Cyl 1", color: "#0284c7", unit: "°C" },
    { key: "E1_CHT2", name: "Cyl 2", color: "#ea580c", unit: "°C" },
    { key: "E1_CHT3", name: "Cyl 3", color: "#059669", unit: "°C" },
    { key: "E1_CHT4", name: "Cyl 4", color: "#6366f1", unit: "°C" },
  ];

  const oilSeries: SeriesConfig[] = [
    { key: "E1_OilT", name: "Oil Temp", color: "#dc2626", unit: "°C" },
    { key: "E1_OilP", name: "Oil Press", color: "#0284c7", unit: "psi" },
  ];

  const egtSeries: SeriesConfig[] = [
    { key: "E1_EGT1", name: "EGT 1", color: "#0284c7", unit: "°C" },
    { key: "E1_EGT2", name: "EGT 2", color: "#ea580c", unit: "°C" },
    { key: "E1_EGT3", name: "EGT 3", color: "#059669", unit: "°C" },
    { key: "E1_EGT4", name: "EGT 4", color: "#6366f1", unit: "°C" },
  ];

  const highlightChannel = selectedCylinder ? `CHT${selectedCylinder}` : null;

  const handleCylinderBadgeClick = (key: string) => {
    if (!onSelectCylinder) return;
    const match = key.match(/CHT(\d)/);
    if (match) {
      const cyl = parseInt(match[1], 10);
      onSelectCylinder(cyl);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* 1. CHT 4-Cylinder Thermal Plot */}
      <MultiLineChart
        title="Cylinder Head Temperatures (CHT1 - CHT4)"
        subtitle="Horizontally-Opposed 4-Cylinder Thermal Gradient"
        icon={Flame}
        series={chtSeries}
        history={history}
        minVal={100}
        maxVal={260}
        cautionThresh={200}
        criticalThresh={230}
        highlightKey={highlightChannel}
        onBadgeClick={handleCylinderBadgeClick}
      />

      {/* 2. Oil System Coupled Dynamics */}
      <MultiLineChart
        title="Engine Lubrication Dynamics"
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
        title="Exhaust Gas Temperatures (EGT1 - EGT4)"
        subtitle="Combustion Distribution Across Exhaust Runners"
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
