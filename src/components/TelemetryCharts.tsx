import { useState, useMemo, useRef, useLayoutEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });
    ro.observe(containerRef.current);
    window.addEventListener("resize", updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const width = containerWidth || 700;
  const height = 115;
  const padding = { top: 12, right: 16, bottom: 20, left: 44 };

  const plotW = Math.max(10, width - padding.left - padding.right);
  const plotH = Math.max(10, height - padding.top - padding.bottom);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Calculate dynamic min/max with head-room padding so curves span the full height
  const [effectiveMin, effectiveMax] = useMemo(() => {
    if (!history.length) return [minVal, maxVal];
    let low = Infinity;
    let high = -Infinity;
    series.forEach((s) => {
      history.forEach((pkt) => {
        const v = pkt?.channels?.[s.key];
        if (typeof v === "number" && !isNaN(v)) {
          if (v < low) low = v;
          if (v > high) high = v;
        }
      });
    });
    if (cautionThresh) high = Math.max(high, cautionThresh);
    if (criticalThresh) high = Math.max(high, criticalThresh);

    if (low === Infinity || high === -Infinity || high <= low) {
      return [minVal, maxVal];
    }
    const range = high - low;
    const padBottom = Math.max(2, range * 0.2);
    const padTop = Math.max(3, range * 0.2);
    return [Math.floor(low - padBottom), Math.ceil(high + padTop)];
  }, [history, series, minVal, maxVal, cautionThresh, criticalThresh]);

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
        const rawVal = pkt?.channels?.[s.key] ?? effectiveMin;
        const clamped = Math.max(effectiveMin, Math.min(effectiveMax, rawVal));
        const y = padding.top + plotH - ((clamped - effectiveMin) / Math.max(1, effectiveMax - effectiveMin)) * plotH;
        ptTuples.push([x, y]);
      }

      const smoothLineD = generateSmoothPath(ptTuples);
      const firstX = ptTuples[0][0].toFixed(1);
      const lastPt = ptTuples[ptTuples.length - 1];
      const lastX = lastPt[0].toFixed(1);
      const bottomY = (padding.top + plotH).toFixed(1);
      const smoothAreaD = `${smoothLineD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

      const lastVal = history[history.length - 1]?.channels?.[s.key] ?? effectiveMin;
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
        lastPt,
      };
    });
  }, [history, series, effectiveMin, effectiveMax, plotW, plotH, padding.left, padding.top, hoverIndex]);

  const cautionY = cautionThresh && cautionThresh >= effectiveMin && cautionThresh <= effectiveMax
    ? padding.top + plotH - ((cautionThresh - effectiveMin) / Math.max(1, effectiveMax - effectiveMin)) * plotH
    : null;
  const criticalY = criticalThresh && criticalThresh >= effectiveMin && criticalThresh <= effectiveMax
    ? padding.top + plotH - ((criticalThresh - effectiveMin) / Math.max(1, effectiveMax - effectiveMin)) * plotH
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
    <div className="dt-panel p-3.5 space-y-2 select-none" style={{ background: "var(--panel)", borderColor: "var(--line)" }}>
      {/* Header with Fixed-Width Indicators */}
      <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-sm shrink-0 flex items-center justify-center" style={{ background: "var(--panel2)", color: "var(--teal)" }}>
            <Icon className="w-4 h-4" />
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
                className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 transition-all cursor-pointer font-mono-tech rounded-none"
                style={{
                  background: isHighlighted ? "var(--text)" : "var(--panel2)",
                  color: isHighlighted ? "var(--panel)" : "var(--text-dim)",
                  border: isHighlighted ? "1px solid var(--text)" : "1px solid var(--line)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                <span className="font-semibold">{p.name}</span>
                <span className="font-bold w-8 text-right inline-block tabular-nums" style={{ color: isHighlighted ? "var(--panel)" : "var(--text)" }}>
                  {Math.round(p.currentVal)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[115px] overflow-hidden cursor-crosshair rounded-none"
        style={{ background: "#FFFFFF", border: "1px solid var(--line)" }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <defs>
            {paths.map((p) => (
              <linearGradient key={`grad-${p.key}`} id={`grad-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.color} stopOpacity="0.22" />
                <stop offset="60%" stopColor={p.color} stopOpacity="0.06" />
                <stop offset="100%" stopColor={p.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Subtle Horizontal Gridlines & Upright Numbers */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
            const y = padding.top + plotH * (1 - frac);
            const val = Math.round(effectiveMin + frac * (effectiveMax - effectiveMin));
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E6EA"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  style={{
                    fill: "#64748B",
                    fontSize: "9px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontStyle: "normal",
                    fontWeight: 500,
                    letterSpacing: "0px",
                  }}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Caution Threshold Line & Indicator Label */}
          {cautionY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={cautionY}
                x2={width - padding.right}
                y2={cautionY}
                stroke="#FF681F"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <text
                x={width - padding.right - 2}
                y={cautionY - 3}
                textAnchor="end"
                className="font-mono-tech"
                style={{ fill: "#FF681F", fontSize: "7.5px", fontWeight: 700 }}
              >
                WARN {cautionThresh}
              </text>
            </g>
          )}

          {/* Critical Threshold Line & Indicator Label */}
          {criticalY !== null && (
            <g>
              <line
                x1={padding.left}
                y1={criticalY}
                x2={width - padding.right}
                y2={criticalY}
                stroke="#DC2626"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <text
                x={width - padding.right - 2}
                y={criticalY - 3}
                textAnchor="end"
                className="font-mono-tech"
                style={{ fill: "#DC2626", fontSize: "7.5px", fontWeight: 700 }}
              >
                CRIT {criticalThresh}
              </text>
            </g>
          )}

          {/* Luminous Area Fills: Smooth Glow Shading */}
          {paths.map((p) => {
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <path
                key={`area-${p.key}`}
                d={p.areaD}
                fill={`url(#grad-${p.key})`}
                opacity={highlightKey && !isHighlighted ? 0.08 : 0.8}
              />
            );
          })}

          {/* Data Series Line Paths: Professional Oscilloscope / Avionics MFD Traces */}
          {paths.map((p) => {
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={isHighlighted ? 2.5 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={highlightKey && !isHighlighted ? 0.22 : 1.0}
              />
            );
          })}

          {/* Real-Time Glowing Lead Points on Curves */}
          {paths.map((p) => {
            if (!p.lastPt) return null;
            const isHighlighted = highlightKey ? p.key.includes(highlightKey) : false;
            return (
              <g key={`lead-${p.key}`}>
                <circle
                  cx={p.lastPt[0]}
                  cy={p.lastPt[1]}
                  r={isHighlighted ? 3.5 : 2.5}
                  fill={p.color}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              </g>
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
            stroke="#CBD5E1"
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
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-sm shrink-0 flex items-center justify-center" style={{ background: "var(--panel2)", color: "var(--ochre)" }}>
            <AlternatorDynamoIcon className="w-4 h-4" color="#FF681F" />
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
