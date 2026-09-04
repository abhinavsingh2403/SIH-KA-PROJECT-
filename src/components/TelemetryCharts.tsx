import { useState, useMemo, useRef } from "react";
import { type LiveTelemetryPacket, type SensorChannel } from "../types/telemetry";
import {
  CylinderCombustionIcon,
  LubricationCircuitIcon,
  ExhaustManifoldIcon,
  AlternatorDynamoIcon,
} from "./AerospaceIcons";

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
  icon: React.ComponentType<{ className?: string; color?: string }>;
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

  // Smooth Catmull-Rom spline / Cubic Bezier curve algorithm
  const generateSmoothPath = (pts: [number, number][]) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      // Catmull-Rom to Cubic Bezier control points (tension = 0.5)
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };

  // Fixed buffer length with smooth Catmull-Rom Bezier curves
  const paths = useMemo(() => {
    if (history.length < 2) return [];

    return series.map((s) => {
      const ptTuples: [number, number][] = [];
      const len = history.length;

      for (let i = 0; i < len; i++) {
        const pkt = history[i];
        const x = padding.left + (i / Math.max(1, len - 1)) * plotW;
        const rawVal = pkt?.channels?.[s.key] ?? minVal;
        const clamped = Math.max(minVal, Math.min(maxVal, rawVal));
        const y = padding.top + plotH - ((clamped - minVal) / (maxVal - minVal)) * plotH;
        ptTuples.push([x, y]);
      }

      const smoothLineD = generateSmoothPath(ptTuples);
      const firstX = ptTuples[0][0].toFixed(1);
      const lastX = ptTuples[ptTuples.length - 1][0].toFixed(1);
      const bottomY = (padding.top + plotH).toFixed(1);
      const smoothAreaD = `${smoothLineD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

      const lastVal = history[history.length - 1]?.channels?.[s.key] ?? minVal;
      const hoveredVal = hoverIndex !== null && history[hoverIndex]
        ? history[hoverIndex]?.channels?.[s.key] ?? lastVal
        : lastVal;

      return {
        key: s.key,
        name: s.name,
        color: s.color,
        d: smoothLineD,
        areaD: smoothAreaD,
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
    <div className="dt-panel p-3.5 space-y-2.5 select-none" style={{ background: "var(--panel)", borderColor: "var(--line)" }}>
      {/* Header with Fixed-Width Indicators to prevent horizontal shaking */}
      <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-none shrink-0" style={{ background: "var(--panel2)", border: "1px solid var(--line-strong)", color: "var(--teal)" }}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold tracking-tight leading-none truncate max-w-[210px]" style={{ color: "var(--text)" }}>{title}</h3>
            <p className="font-mono-tech text-[9.5px] leading-tight mt-0.5 truncate max-w-[210px]" style={{ color: "var(--text-faint)" }}>{subtitle}</p>
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
                className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 transition-all cursor-pointer font-mono-tech"
                style={{
                  background: isHighlighted ? "var(--text)" : "var(--panel2)",
                  color: isHighlighted ? "var(--panel)" : "var(--text-dim)",
                  border: isHighlighted ? "1px solid var(--text)" : "1px solid var(--line)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                <span className="font-semibold">{p.name.split(" ")[0]}</span>
                <span className="font-bold w-8 text-right inline-block tabular-nums" style={{ color: isHighlighted ? "var(--panel)" : "var(--text)" }}>
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
        className="relative w-full h-[105px] overflow-hidden cursor-crosshair"
        style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}
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
                  stroke="var(--line)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <text
                  x={padding.left - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="font-mono-tech tabular-nums"
                  style={{ fill: "var(--text-faint)", fontSize: "8.5px" }}
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
              stroke="var(--amber)"
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
              stroke="var(--red)"
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
    <div className="dt-panel p-3.5 space-y-2.5 select-none" style={{ background: "var(--panel)", borderColor: "var(--line)" }}>
      <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-none shrink-0" style={{ background: "var(--panel2)", border: "1px solid var(--line-strong)", color: "var(--ochre)" }}>
            <AlternatorDynamoIcon className="w-3.5 h-3.5" color="#FF681F" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold tracking-tight leading-none" style={{ color: "var(--text)" }}>28V DC Electrical Generation</h3>
            <p className="font-mono-tech text-[9.5px] leading-tight mt-0.5" style={{ color: "var(--text-faint)" }}>Dual Alternator / Bus Load Distribution</p>
          </div>
        </div>
        <span className="text-[9.5px] font-mono-tech px-2 py-0.5 font-bold" style={{ color: "var(--green)", background: "var(--green-bg)", border: "1px solid var(--green)" }}>
          28V REGULATED
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Bus 1 */}
        <div className="p-2.5 space-y-1.5" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-[10px] font-bold" style={{ color: "var(--text-dim)" }}>BUS 1 (PRIMARY)</span>
            <span className="font-mono-tech text-[13px] font-bold tabular-nums" style={{ color: v1 < 26 ? "var(--red)" : "var(--teal)" }}>
              {v1.toFixed(1)} V
            </span>
          </div>
          <div style={{ height: 4, background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(0, ((v1 - 22) / (32 - 22)) * 100))}%`,
                background: v1 < 26 ? "var(--red)" : "var(--teal)",
                transition: "width 0.2s ease"
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono-tech text-[9.5px]" style={{ color: "var(--text-faint)" }}>
            <span>Load: {Math.round(a1)} A</span>
            <span>24 - 30V OK</span>
          </div>
        </div>

        {/* Bus 2 */}
        <div className="p-2.5 space-y-1.5" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-[10px] font-bold" style={{ color: "var(--text-dim)" }}>BUS 2 (ESSENTIAL)</span>
            <span className="font-mono-tech text-[13px] font-bold tabular-nums" style={{ color: v2 < 26 ? "var(--red)" : "var(--teal)" }}>
              {v2.toFixed(1)} V
            </span>
          </div>
          <div style={{ height: 4, background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(0, ((v2 - 22) / (32 - 22)) * 100))}%`,
                background: v2 < 26 ? "var(--red)" : "var(--teal)",
                transition: "width 0.2s ease"
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono-tech text-[9.5px]" style={{ color: "var(--text-faint)" }}>
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
    { key: "E1_CHT1", name: "Cyl 1", color: "#FF681F", unit: "°C" }, // SIH Saffron Orange
    { key: "E1_CHT2", name: "Cyl 2", color: "#E11D48", unit: "°C" }, // Thermal Rose/Red
    { key: "E1_CHT3", name: "Cyl 3", color: "#0B8F46", unit: "°C" }, // SIH Emerald Green
    { key: "E1_CHT4", name: "Cyl 4", color: "#0284C7", unit: "°C" }, // Tech Azure
  ];

  const oilSeries: SeriesConfig[] = [
    { key: "E1_OilT", name: "Oil Temp", color: "#FF681F", unit: "°C" },
    { key: "E1_OilP", name: "Oil Press", color: "#0B8F46", unit: "psi" },
  ];

  const egtSeries: SeriesConfig[] = [
    { key: "E1_EGT1", name: "EGT 1", color: "#FF681F", unit: "°C" },
    { key: "E1_EGT2", name: "EGT 2", color: "#E11D48", unit: "°C" },
    { key: "E1_EGT3", name: "EGT 3", color: "#0B8F46", unit: "°C" },
    { key: "E1_EGT4", name: "EGT 4", color: "#0284C7", unit: "°C" },
  ];

  const highlightChannel = selectedCylinder ? `CHT${selectedCylinder}` : null;

  const handleCylinderBadgeClick = (key: string) => {
    if (!onSelectCylinder) return;
    const match = key.match(/(?:CHT|EGT)(\d)/);
    if (match) {
      const cyl = parseInt(match[1], 10);
      onSelectCylinder(cyl);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* 1. CHT 4-Cylinder Thermal Plot */}
      <MultiLineChart
        title="Cylinder Head Temps (CHT 1–4)"
        subtitle="Horizontally-Opposed Boxer Thermal Gradient"
        icon={CylinderCombustionIcon}
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
        title="Lubrication Dynamics (OilT / OilP)"
        subtitle="E1_OilT (°C) vs E1_OilP (psi) Coupled Margin"
        icon={LubricationCircuitIcon}
        series={oilSeries}
        history={history}
        minVal={30}
        maxVal={140}
        cautionThresh={115}
      />

      {/* 3. EGT Exhaust Gas Temperatures */}
      <MultiLineChart
        title="Exhaust Gas Temps (EGT 1–4)"
        subtitle="Combustion Exhaust Distribution"
        icon={ExhaustManifoldIcon}
        series={egtSeries}
        history={history}
        minVal={400}
        maxVal={850}
        cautionThresh={760}
        highlightKey={selectedCylinder ? `EGT${selectedCylinder}` : null}
        onBadgeClick={handleCylinderBadgeClick}
      />

      {/* 4. Dual 28V DC Electrical Bus */}
      <ElectricalBusSection packet={packet} />
    </div>
  );
}
