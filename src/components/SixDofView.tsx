import { useMemo } from "react";
import { type SixDofState } from "../types/telemetry";
import { SixDofGimbalIcon } from "./AerospaceIcons";

interface SixDofViewProps {
  state: SixDofState;
  onUpdateState?: (updater: (prev: SixDofState) => SixDofState) => void;
  engineRpm: number;
}

export function SixDofView({ state, onUpdateState, engineRpm }: SixDofViewProps) {
  const {
    roll,
    pitch,
    yaw,
    rollRate,
    pitchRate,
    yawRate,
    surgeAx,
    swayAy,
    heaveAz,
    airspeedKts,
    verticalSpeedFpm,
    sideslipBeta,
    torqueRollReaction,
    gyroPrecessionMoment,
    mountVibrationRms,
    isAutopilotCoupled,
  } = state;

  // Normalized heading (0 - 359°) and cardinal representation
  const normalizedYaw = ((yaw % 360) + 360) % 360;
  const headingText = useMemo(() => {
    const cardinals = [
      { max: 22.5, text: "N" },
      { max: 67.5, text: "NE" },
      { max: 112.5, text: "E" },
      { max: 157.5, text: "SE" },
      { max: 202.5, text: "S" },
      { max: 247.5, text: "SW" },
      { max: 292.5, text: "W" },
      { max: 337.5, text: "NW" },
      { max: 360, text: "N" },
    ];
    const match = cardinals.find((c) => normalizedYaw <= c.max);
    return `${Math.round(normalizedYaw).toString().padStart(3, "0")}° ${match?.text || "N"}`;
  }, [normalizedYaw]);

  // Derived barometric altitude and engine vibration frequencies
  const estimatedAltFt = Math.max(1200, Math.round(8500 + pitch * 240 + verticalSpeedFpm * 0.5));
  const crankFreqHz = (engineRpm / 60).toFixed(1);
  const firingFreqHz = ((engineRpm * 2) / 60).toFixed(1);

  // Attitude Director Indicator (ADI) center & radius
  const adiW = 200;
  const adiH = 190;
  const cx = adiW / 2;
  const cy = adiH / 2;
  const adiRadius = 78;
  const pitchOffset = Math.max(-adiRadius + 4, Math.min(adiRadius - 4, pitch * 1.9));

  // Flight Path Vector (FPV) coordinates relative to center
  const fpvX = Math.max(-28, Math.min(28, sideslipBeta * 8));
  const fpvY = Math.max(-28, Math.min(28, -(verticalSpeedFpm / 100) * 2.2));

  // Quick Flight Presets
  const applyPreset = (preset: "patrol" | "climb" | "cruise" | "combat" | "glide") => {
    onUpdateState?.((prev) => {
      let r = 0, p = 0, y = prev.yaw, ax = 0.02, az = 1.0, spd = 78, vs = 0;
      if (preset === "patrol") {
        r = 5.8; p = 1.8; ax = 0.02; az = 1.0; spd = 76; vs = 0;
      } else if (preset === "climb") {
        r = 0; p = 8.5; ax = 0.24; az = 1.08; spd = 88; vs = 850;
      } else if (preset === "cruise") {
        r = -0.6; p = 1.0; ax = 0.0; az = 1.0; spd = 112; vs = 0;
      } else if (preset === "combat") {
        r = 26.0; p = 4.2; ax = 0.38; az = 1.45; spd = 138; vs = 1250;
      } else if (preset === "glide") {
        r = 0; p = -3.5; ax = -0.15; az = 0.92; spd = 70; vs = -650;
      }
      return {
        ...prev,
        roll: r,
        pitch: p,
        yaw: y,
        rollRate: r !== 0 ? 0.8 : 0,
        pitchRate: p !== 0 ? 0.2 : 0,
        surgeAx: ax,
        heaveAz: az,
        airspeedKts: spd,
        verticalSpeedFpm: vs,
        isAutopilotCoupled: false,
      };
    });
  };

  const toggleAutopilotCoupled = () => {
    onUpdateState?.((prev) => ({
      ...prev,
      isAutopilotCoupled: !prev.isAutopilotCoupled,
    }));
  };

  const handleResetAttitude = () => {
    onUpdateState?.((prev) => ({
      ...prev,
      roll: 0,
      pitch: 0,
      yaw: 84,
      rollRate: 0,
      pitchRate: 0,
      yawRate: 0,
      surgeAx: 0,
      swayAy: 0,
      heaveAz: 1.0,
      airspeedKts: 85,
      verticalSpeedFpm: 0,
      sideslipBeta: 0,
      isAutopilotCoupled: false,
    }));
  };

  return (
    <div className="space-y-3 select-none">
      {/* ─── Top Command & Tactical Status Bar ───────────────────────────────── */}
      <div
        className="dt-panel p-3 flex items-center justify-between"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-sm shrink-0 flex items-center justify-center"
            style={{ background: "var(--panel2)", color: "#0284C7" }}
          >
            <SixDofGimbalIcon className="w-4 h-4" color="#0284C7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[12.5px] font-bold tracking-tight leading-none" style={{ color: "var(--text)" }}>
                6-DOF Flight Dynamics & Inertial Navigation Station
              </h3>
              <span className="font-mono-tech text-[9px] px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-300 font-bold">
                DRDO TAPAS UAV MFD
              </span>
            </div>
            <p className="font-mono-tech text-[9.5px] leading-tight mt-0.5" style={{ color: "var(--text-faint)" }}>
              Six Degrees of Freedom Trajectory · Primary Flight Display (PFD) · Aero Engine Kinematic Coupling
            </p>
          </div>
        </div>

        {/* Operational Mode Controls */}
        <div className="flex items-center gap-1.5 font-mono-tech text-[10px]">
          <button
            onClick={toggleAutopilotCoupled}
            className="px-2.5 py-1 font-bold cursor-pointer transition-all rounded-none"
            style={{
              background: isAutopilotCoupled ? "var(--teal)" : "var(--panel2)",
              color: isAutopilotCoupled ? "#FFFFFF" : "var(--text-dim)",
              border: isAutopilotCoupled ? "1px solid var(--teal)" : "1px solid var(--line)",
            }}
          >
            {isAutopilotCoupled ? "AUTOPILOT COUPLED" : "MANUAL 6-DOF OVERRIDE"}
          </button>
          {!isAutopilotCoupled && (
            <button
              onClick={handleResetAttitude}
              className="px-2 py-1 cursor-pointer transition-all hover:opacity-80 rounded-none"
              style={{
                background: "var(--panel2)",
                color: "var(--text)",
                border: "1px solid var(--line)",
              }}
              title="Reset 6-DOF attitude to wings level"
            >
              LEVEL 0°
            </button>
          )}
        </div>
      </div>

      {/* ─── Avionics Primary Flight Display (PFD) Suite ─────────────────────── */}
      <div
        className="dt-panel p-3.5"
        style={{ background: "#0F172A", border: "1px solid #334155", color: "#F8FAFC" }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-3">
          <div className="flex items-center gap-2 font-mono-tech text-[10.5px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-200">PFD ATTITUDE & AIR DATA COMPUTER</span>
            <span className="text-slate-400">· AHRS DUAL-CHANNEL</span>
          </div>
          <div className="flex items-center gap-3 font-mono-tech text-[10px] text-slate-300">
            <span>HDG: <b className="text-sky-300">{headingText}</b></span>
            <span>ALT: <b className="text-emerald-300">{estimatedAltFt.toLocaleString()} FT</b></span>
            <span>IAS: <b className="text-amber-300">{Math.round(airspeedKts)} KTS</b></span>
          </div>
        </div>

        {/* PFD Instruments Cluster: Speed Tape (Left) + Artificial Horizon (Center) + Altitude Tape (Right) */}
        <div className="grid grid-cols-12 gap-2 items-center justify-center">
          {/* 1. Airspeed Tape (IAS / TAS) */}
          <div className="col-span-3 p-2 bg-slate-900/90 border border-slate-700/80 font-mono-tech text-[10px] space-y-1.5">
            <div className="flex justify-between text-[9px] text-slate-400 border-b border-slate-700/60 pb-1">
              <span>AIRSPEED</span>
              <span className="text-amber-400 font-bold">KTS</span>
            </div>
            {/* Speed Readout Box */}
            <div className="flex items-baseline justify-between py-1 px-2 bg-slate-800 border border-amber-400/80">
              <span className="text-[9.5px] text-amber-300 font-bold">IAS</span>
              <span className="text-[17px] font-bold tabular-nums text-amber-300">{Math.round(airspeedKts)}</span>
            </div>
            {/* Speed Scale Bars */}
            <div className="space-y-1 text-[9px] text-slate-400 pt-0.5">
              {[120, 100, 80, 60].map((v) => (
                <div key={v} className="flex items-center justify-between">
                  <span>{v}</span>
                  <div className="h-1 flex-1 mx-2 bg-slate-800 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70"
                      style={{ width: `${Math.min(100, (airspeedKts / v) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[8.5px] text-slate-400 flex justify-between pt-1">
              <span>STALL: 52K</span>
              <span>V_NE: 145K</span>
            </div>
          </div>

          {/* 2. Center: Primary Attitude Director Indicator (Artificial Horizon) */}
          <div className="col-span-6 flex flex-col items-center justify-center">
            <div className="relative w-[200px] h-[190px] rounded-full overflow-hidden border-2 border-slate-600 shadow-2xl bg-slate-950">
              <svg viewBox={`0 0 ${adiW} ${adiH}`} className="w-full h-full block">
                <defs>
                  <clipPath id="pfd-horizon-clip">
                    <circle cx={cx} cy={cy} r={adiRadius} />
                  </clipPath>
                  <linearGradient id="pfd-sky-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                  <linearGradient id="pfd-ground-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78350F" />
                    <stop offset="100%" stopColor="#3F1D0B" />
                  </linearGradient>
                </defs>

                {/* Horizon Circle Clipped Viewport */}
                <g clipPath="url(#pfd-horizon-clip)">
                  {/* Rotating & Translating Sky/Ground Horizon Group */}
                  <g transform={`rotate(${-roll}, ${cx}, ${cy})`}>
                    <g transform={`translate(0, ${pitchOffset})`}>
                      {/* Sky */}
                      <rect x="-100" y="-200" width="400" height="295" fill="url(#pfd-sky-grad)" />
                      {/* Ground */}
                      <rect x="-100" y="95" width="400" height="300" fill="url(#pfd-ground-grad)" />
                      {/* White Horizon Line */}
                      <line x1="-100" y1="95" x2="300" y2="95" stroke="#FFFFFF" strokeWidth="2" />

                      {/* Calibrated Pitch Ladder Bars */}
                      {[-25, -20, -15, -10, -5, 5, 10, 15, 20, 25].map((deg) => {
                        const yPos = 95 - deg * 1.9;
                        const isMajor = Math.abs(deg) % 10 === 0;
                        const halfW = isMajor ? 26 : 15;
                        return (
                          <g key={`pfd-pitch-${deg}`}>
                            <line
                              x1={cx - halfW}
                              y1={yPos}
                              x2={cx + halfW}
                              y2={yPos}
                              stroke="#FFFFFF"
                              strokeWidth={isMajor ? 1.6 : 1.0}
                              opacity={0.92}
                            />
                            {isMajor && (
                              <>
                                <text
                                  x={cx - halfW - 4}
                                  y={yPos + 3}
                                  textAnchor="end"
                                  fill="#FFFFFF"
                                  fontSize="7.5"
                                  fontFamily="'IBM Plex Mono', monospace"
                                  fontWeight="700"
                                >
                                  {Math.abs(deg)}
                                </text>
                                <text
                                  x={cx + halfW + 4}
                                  y={yPos + 3}
                                  textAnchor="start"
                                  fill="#FFFFFF"
                                  fontSize="7.5"
                                  fontFamily="'IBM Plex Mono', monospace"
                                  fontWeight="700"
                                >
                                  {Math.abs(deg)}
                                </text>
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  </g>

                  {/* Roll Arc Scale (Top Fixed) */}
                  {[-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map((deg) => {
                    const rad = (deg - 90) * (Math.PI / 180);
                    const tickLen = Math.abs(deg) === 0 || Math.abs(deg) === 30 || Math.abs(deg) === 60 ? 8 : 4.5;
                    const x1 = cx + (adiRadius - 1) * Math.cos(rad);
                    const y1 = cy + (adiRadius - 1) * Math.sin(rad);
                    const x2 = cx + (adiRadius - 1 - tickLen) * Math.cos(rad);
                    const y2 = cy + (adiRadius - 1 - tickLen) * Math.sin(rad);
                    return (
                      <line
                        key={`roll-${deg}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#FFFFFF"
                        strokeWidth={Math.abs(deg) === 0 ? 2 : 1.2}
                      />
                    );
                  })}

                  {/* Rotating Roll Bank Pointer (Amber Triangle) */}
                  <g transform={`rotate(${-roll}, ${cx}, ${cy})`}>
                    <polygon
                      points={`${cx},${cy - adiRadius + 2} ${cx - 5.5},${cy - adiRadius + 10} ${cx + 5.5},${cy - adiRadius + 10}`}
                      fill="#FF681F"
                    />
                  </g>

                  {/* Flight Path Vector (FPV / Bird Marker) */}
                  <g transform={`translate(${cx + fpvX}, ${cy + fpvY})`}>
                    <circle cx="0" cy="0" r="4.5" fill="none" stroke="#22C55E" strokeWidth="1.5" />
                    <line x1="-9" y1="0" x2="-4.5" y2="0" stroke="#22C55E" strokeWidth="1.5" />
                    <line x1="4.5" y1="0" x2="9" y2="0" stroke="#22C55E" strokeWidth="1.5" />
                    <line x1="0" y1="-4.5" x2="0" y2="-9" stroke="#22C55E" strokeWidth="1.5" />
                  </g>

                  {/* Fixed Aircraft Reference Symbol (Gold / Amber Gull Wings) */}
                  <g id="fixed-aircraft-symbol">
                    <circle cx={cx} cy={cy} r="3" fill="#F59E0B" stroke="#000000" strokeWidth="0.8" />
                    <path
                      d={`M ${cx - 42} ${cy} L ${cx - 15} ${cy} L ${cx - 15} ${cy + 6.5}`}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`M ${cx + 42} ${cy} L ${cx + 15} ${cy} L ${cx + 15} ${cy + 6.5}`}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="3.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>

                  {/* Inclinometer / Slip-Skid Indicator Tube */}
                  <g transform={`translate(${cx}, ${adiH - 18})`}>
                    <rect x="-32" y="-5" width="64" height="10" rx="4" fill="#020617" stroke="#475569" strokeWidth="1" />
                    <line x1="-8" y1="-5" x2="-8" y2="5" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="1 1" />
                    <line x1="8" y1="-5" x2="8" y2="5" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="1 1" />
                    <circle
                      cx={Math.max(-23, Math.min(23, swayAy * 50))}
                      cy="0"
                      r="4.2"
                      fill="#F8FAFC"
                      stroke="#0284C7"
                      strokeWidth="1"
                    />
                  </g>
                </g>
              </svg>
            </div>

            {/* Quick Digital Pitch & Bank */}
            <div className="flex items-center gap-3 mt-1.5 font-mono-tech text-[10px] text-slate-300">
              <span>ROLL: <b className="text-sky-400">{roll > 0 ? `+${roll.toFixed(1)}°` : `${roll.toFixed(1)}°`}</b></span>
              <span className="text-slate-600">|</span>
              <span>PITCH: <b className="text-emerald-400">{pitch > 0 ? `+${pitch.toFixed(1)}°` : `${pitch.toFixed(1)}°`}</b></span>
            </div>
          </div>

          {/* 3. Barometric Altitude & VSI Tape (Right) */}
          <div className="col-span-3 p-2 bg-slate-900/90 border border-slate-700/80 font-mono-tech text-[10px] space-y-1.5">
            <div className="flex justify-between text-[9px] text-slate-400 border-b border-slate-700/60 pb-1">
              <span>ALTITUDE</span>
              <span className="text-emerald-400 font-bold">FT MSL</span>
            </div>
            {/* Altitude Readout Box */}
            <div className="flex items-baseline justify-between py-1 px-2 bg-slate-800 border border-emerald-400/80">
              <span className="text-[9.5px] text-emerald-300 font-bold">ALT</span>
              <span className="text-[17px] font-bold tabular-nums text-emerald-300">{estimatedAltFt.toLocaleString()}</span>
            </div>
            {/* Vertical Speed Indicator (VSI) */}
            <div className="space-y-1 text-[9px] text-slate-400 pt-0.5">
              <div className="flex justify-between">
                <span>VSI RATE:</span>
                <span className={`font-bold tabular-nums ${verticalSpeedFpm >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {verticalSpeedFpm >= 0 ? `+${Math.round(verticalSpeedFpm)}` : Math.round(verticalSpeedFpm)} FPM
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-xs overflow-hidden flex items-center">
                <div
                  className={`h-full ${verticalSpeedFpm >= 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{
                    width: `${Math.min(100, Math.abs(verticalSpeedFpm) / 15)}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-[8.5px] text-slate-400 flex justify-between pt-1">
              <span>QNH: 1013 hPa</span>
              <span>AOA: {Math.max(0, (pitch * 0.85 + 1.2)).toFixed(1)}°</span>
            </div>
          </div>
        </div>

        {/* Tactical Heading Tape (HSI Compass) */}
        <div className="mt-2.5 pt-2 border-t border-slate-700/80 flex items-center justify-between font-mono-tech text-[9.5px]">
          <span className="text-slate-400">MAGNETIC HEADING TAPE:</span>
          <div className="flex items-center gap-4 bg-slate-900 px-3 py-1 border border-slate-700">
            {[-40, -20, 0, 20, 40].map((delta) => {
              const deg = Math.round(((normalizedYaw + delta) % 360 + 360) % 360);
              const isCenter = delta === 0;
              return (
                <span key={delta} className={`tabular-nums ${isCenter ? "text-sky-300 font-bold text-[11px] underline" : "text-slate-400 text-[9px]"}`}>
                  {deg.toString().padStart(3, "0")}°
                </span>
              );
            })}
          </div>
          <span className="text-emerald-400 font-semibold">TRUE TRACK SYNCHRONIZED</span>
        </div>
      </div>

      {/* ─── Categorized 6-DOF Degrees of Freedom Grid ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Card 1: Rotational 3-DOF (Angular Attitude & Body Rates) */}
        <div
          className="dt-panel p-3 space-y-2 select-none"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-600" />
              <h4 className="text-[11px] font-bold text-sky-800">
                1. ROTATIONAL 3-DOF (EULER ANGLES & RATES)
              </h4>
            </div>
            <span className="font-mono-tech text-[9px]" style={{ color: "var(--text-faint)" }}>
              AIRCRAFT BODY AXIS (B)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono-tech">
            {/* Roll (phi) */}
            <div className="p-2" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
              <span className="text-[9.5px] block" style={{ color: "var(--text-dim)" }}>ROLL (φ)</span>
              <div className="text-[14px] font-bold my-0.5" style={{ color: Math.abs(roll) > 20 ? "#DC2626" : "#0284C7" }}>
                {roll > 0 ? `+${roll.toFixed(1)}°` : `${roll.toFixed(1)}°`}
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                p: {rollRate > 0 ? `+${rollRate.toFixed(2)}` : rollRate.toFixed(2)}°/s
              </span>
            </div>

            {/* Pitch (theta) */}
            <div className="p-2" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
              <span className="text-[9.5px] block" style={{ color: "var(--text-dim)" }}>PITCH (θ)</span>
              <div className="text-[14px] font-bold my-0.5" style={{ color: Math.abs(pitch) > 15 ? "#FF681F" : "#0B8F46" }}>
                {pitch > 0 ? `+${pitch.toFixed(1)}°` : `${pitch.toFixed(1)}°`}
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                q: {pitchRate > 0 ? `+${pitchRate.toFixed(2)}` : pitchRate.toFixed(2)}°/s
              </span>
            </div>

            {/* Yaw (psi) */}
            <div className="p-2" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
              <span className="text-[9.5px] block" style={{ color: "var(--text-dim)" }}>YAW (ψ)</span>
              <div className="text-[14px] font-bold my-0.5" style={{ color: "var(--text)" }}>
                {Math.round(normalizedYaw)}°
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                r: {yawRate > 0 ? `+${yawRate.toFixed(2)}` : yawRate.toFixed(2)}°/s
              </span>
            </div>
          </div>

          <p className="font-mono-tech text-[9px] pt-1" style={{ color: "var(--text-faint)" }}>
            Euler kinematic transformations: [p, q, r]ᵀ = R_z(ψ) R_y(θ) R_x(φ) inertial body rates.
          </p>
        </div>

        {/* Card 2: Translational 3-DOF (Linear Accelerations & Load Factor) */}
        <div
          className="dt-panel p-3 space-y-2 select-none"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <h4 className="text-[11px] font-bold text-amber-800">
                2. TRANSLATIONAL 3-DOF (ACCELERATIONS & G-LOAD)
              </h4>
            </div>
            <span className="font-mono-tech text-[9px]" style={{ color: "var(--text-faint)" }}>
              INERTIAL NED FRAME
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono-tech">
            {/* Surge (Ax) */}
            <div className="p-2" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
              <span className="text-[9.5px] block" style={{ color: "var(--text-dim)" }}>SURGE (a_x)</span>
              <div className="text-[14px] font-bold my-0.5" style={{ color: "#FF681F" }}>
                {surgeAx > 0 ? `+${surgeAx.toFixed(2)}` : surgeAx.toFixed(2)} g
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                Thrust: {Math.round(surgeAx * 1800 * 9.81)} N
              </span>
            </div>

            {/* Sway (Ay) */}
            <div className="p-2" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
              <span className="text-[9.5px] block" style={{ color: "var(--text-dim)" }}>SWAY (a_y)</span>
              <div className="text-[14px] font-bold my-0.5" style={{ color: Math.abs(swayAy) > 0.1 ? "#DC2626" : "var(--text)" }}>
                {swayAy > 0 ? `+${swayAy.toFixed(2)}` : swayAy.toFixed(2)} g
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                Sideslip: {sideslipBeta.toFixed(1)}°
              </span>
            </div>

            {/* Heave (Az) */}
            <div className="p-2" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
              <span className="text-[9.5px] block" style={{ color: "var(--text-dim)" }}>HEAVE (a_z)</span>
              <div className="text-[14px] font-bold my-0.5" style={{ color: Math.abs(heaveAz - 1.0) > 0.3 ? "#FF681F" : "#0B8F46" }}>
                {heaveAz.toFixed(2)} g
              </div>
              <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                Limit: -1.5g / +3.8g
              </span>
            </div>
          </div>

          <p className="font-mono-tech text-[9px] pt-1" style={{ color: "var(--text-faint)" }}>
            Newtonian equations: m(u̇ + qw - rv) = F_thrust - D - mg sin(θ).
          </p>
        </div>
      </div>

      {/* ─── Aero Piston Engine Coupled Flight Mechanics & Vibration ─────────── */}
      <div
        className="dt-panel p-3 space-y-2.5 select-none"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <h4 className="text-[11.5px] font-bold" style={{ color: "var(--text)" }}>
              Engine Aeromechanical Dynamic Coupling & Tri-Axial Vibration
            </h4>
          </div>
          <span className="font-mono-tech text-[9.5px] px-2 py-0.5" style={{ background: "var(--panel2)", color: "var(--text-dim)", border: "1px solid var(--line)" }}>
            RPM: {Math.round(engineRpm)} · f_crank: {crankFreqHz} Hz · f_fire: {firingFreqHz} Hz
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono-tech text-[11px]">
          {/* Torque Reaction */}
          <div className="p-2.5 space-y-1" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div className="flex justify-between text-[9.5px]" style={{ color: "var(--text-dim)" }}>
              <span>COUNTER-TORQUE (τ_x)</span>
              <span className="text-emerald-700 font-bold">ROLL COUPLING</span>
            </div>
            <div className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
              {torqueRollReaction.toFixed(1)} N·m
            </div>
            <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              τ = P_brake / ω_prop counter-clockwise torque roll deflection.
            </p>
          </div>

          {/* Gyroscopic Precession */}
          <div className="p-2.5 space-y-1" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div className="flex justify-between text-[9.5px]" style={{ color: "var(--text-dim)" }}>
              <span>GYROSCOPIC COUPLE (M_gyro)</span>
              <span className="text-sky-700 font-bold">YAW/PITCH</span>
            </div>
            <div className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
              {gyroPrecessionMoment.toFixed(1)} N·m
            </div>
            <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              M = I_prop × ω cross-axis precession moment during pitch/yaw rates.
            </p>
          </div>

          {/* Tri-Axial Mount Vibration */}
          <div className="p-2.5 space-y-1" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div className="flex justify-between text-[9.5px]" style={{ color: "var(--text-dim)" }}>
              <span>MOUNT VIBRATION (RMS)</span>
              <span className="text-amber-700 font-bold">ISO 10816</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[12px] font-bold" style={{ color: mountVibrationRms.x > 8 ? "#DC2626" : "var(--text)" }}>
                X: {mountVibrationRms.x.toFixed(1)}
              </span>
              <span className="text-[12px] font-bold" style={{ color: mountVibrationRms.y > 8 ? "#DC2626" : "var(--text)" }}>
                Y: {mountVibrationRms.y.toFixed(1)}
              </span>
              <span className="text-[12px] font-bold" style={{ color: mountVibrationRms.z > 8 ? "#DC2626" : "var(--text)" }}>
                Z: {mountVibrationRms.z.toFixed(1)} mm/s
              </span>
            </div>
            <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              {mountVibrationRms.x > 8 ? "WARNING: Harmonic resonance" : "NOMINAL: Class I envelope (< 4.5 mm/s)"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Mission Profile Attitude Presets & Interactive Sliders ──────────── */}
      <div
        className="dt-panel p-3 space-y-2.5 select-none"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "var(--line)" }}>
          <span className="font-mono-tech text-[10.5px] font-bold" style={{ color: "var(--text)" }}>
            FLIGHT PROFILE POSE PRESETS & ATTITUDE OVERRIDE
          </span>
          <span className="font-mono-tech text-[9.5px] text-sky-700 font-semibold">
            LIVE 3D TWIN SYNCHRONIZED
          </span>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 font-mono-tech text-[10px]">
          <button
            onClick={() => applyPreset("patrol")}
            className="p-1.5 text-center transition-all cursor-pointer hover:opacity-85"
            style={{ background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            <div className="font-bold text-sky-700">PATROL LOITER</div>
            <div className="text-[8.5px]" style={{ color: "var(--text-faint)" }}>+1.8° θ / 5.8° φ</div>
          </button>
          <button
            onClick={() => applyPreset("climb")}
            className="p-1.5 text-center transition-all cursor-pointer hover:opacity-85"
            style={{ background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            <div className="font-bold text-emerald-700">CLIMB OUT</div>
            <div className="text-[8.5px]" style={{ color: "var(--text-faint)" }}>+8.5° θ / +850 FPM</div>
          </button>
          <button
            onClick={() => applyPreset("cruise")}
            className="p-1.5 text-center transition-all cursor-pointer hover:opacity-85"
            style={{ background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            <div className="font-bold text-slate-700">CRUISE DASH</div>
            <div className="text-[8.5px]" style={{ color: "var(--text-faint)" }}>+1.0° θ / 112 KTS</div>
          </button>
          <button
            onClick={() => applyPreset("combat")}
            className="p-1.5 text-center transition-all cursor-pointer hover:opacity-85"
            style={{ background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            <div className="font-bold text-amber-700">HIGH-G TURN</div>
            <div className="text-[8.5px]" style={{ color: "var(--text-faint)" }}>26° φ / 1.45g</div>
          </button>
          <button
            onClick={() => applyPreset("glide")}
            className="p-1.5 text-center transition-all cursor-pointer hover:opacity-85"
            style={{ background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--text)" }}
          >
            <div className="font-bold text-rose-700">GLIDE DESCENT</div>
            <div className="text-[8.5px]" style={{ color: "var(--text-faint)" }}>-3.5° θ / -650 FPM</div>
          </button>
        </div>

        {/* Interactive Sliders (Available in Manual Mode) */}
        {!isAutopilotCoupled && (
          <div className="pt-2 border-t border-dashed border-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono-tech text-[10.5px]">
            {/* Roll Slider */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-dim)" }}>Roll (φ):</span>
                <span className="font-bold" style={{ color: "#0284C7" }}>{roll.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="0.5"
                value={roll}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateState?.((prev) => ({ ...prev, roll: val, rollRate: (val - prev.roll) * 2 }));
                }}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            {/* Pitch Slider */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-dim)" }}>Pitch (θ):</span>
                <span className="font-bold" style={{ color: "#0B8F46" }}>{pitch.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-25"
                max="25"
                step="0.5"
                value={pitch}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateState?.((prev) => ({ ...prev, pitch: val, pitchRate: (val - prev.pitch) * 2 }));
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Yaw Slider */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-dim)" }}>Yaw (ψ):</span>
                <span className="font-bold" style={{ color: "var(--text)" }}>{Math.round(normalizedYaw)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={normalizedYaw}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateState?.((prev) => ({ ...prev, yaw: val }));
                }}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
