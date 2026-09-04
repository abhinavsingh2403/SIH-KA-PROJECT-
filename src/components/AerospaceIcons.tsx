interface AerospaceIconProps {
  className?: string;
  size?: number;
  color?: string;
}

/** 1. Mission Flight Debrief & Sortie Telemetry Log (Clean Minimalist Tactical Document) */
export function DebriefTacticalIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M14 2H6C5.45 2 5 2.45 5 3V21C5 21.55 5.45 22 6 22H18C18.55 22 19 21.55 19 21V7L14 2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 2V7H19" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 13H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 17H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 2. Real-Time Telemetry Cloud Database (Geometric Dual Server Stack) */
export function DatabaseUplinkIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="4" width="18" height="6" rx="1.5" stroke={color} strokeWidth="1.6" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" stroke={color} strokeWidth="1.6" />
      <circle cx="7" cy="7" r="1" fill={color} />
      <circle cx="7" cy="17" r="1" fill={color} />
      <path d="M14 7H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 17H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 3. Federated Fleet Learning (Precision UAV Tri-Node Constellation) */
export function FleetMeshIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="5" r="2.5" stroke={color} strokeWidth="1.6" />
      <circle cx="5" cy="18" r="2.5" stroke={color} strokeWidth="1.6" />
      <circle cx="19" cy="18" r="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M7.2 16.2L10.2 7.2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16.8 16.2L13.8 7.2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7.5 18H16.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 4. Cylinder Head Thermal Gradient (Combustion Chamber Piston / Flame Vector) */
export function CylinderCombustionIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Combustion Core Flame */}
      <path
        d="M12 2.5C12 2.5 6.5 8 6.5 14C6.5 17.5 9 20.5 12 20.5C15 20.5 17.5 17.5 17.5 14C17.5 8 12 2.5 12 2.5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner Thermal Nucleus */}
      <path
        d="M12 12C11 13 10 14.2 10 15.5C10 16.8 10.9 17.8 12 17.8C13.1 17.8 14 16.8 14 15.5C14 14.2 13 13 12 12Z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 5. Engine Lubrication & Oil Viscosity Dynamics (Precision Droplet with Fluid Pressure Wave) */
export function LubricationCircuitIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 2.5L6.5 12.8C5.2 15.3 5.8 18.5 8.2 20.2C10.5 21.9 13.5 21.9 15.8 20.2C18.2 18.5 18.8 15.3 17.5 12.8L12 2.5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 15C9.5 17 11.2 18 13.5 18"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 6. Exhaust Gas Temperature & Manifold Dynamics (High-Velocity Exhaust Wave Traces) */
export function ExhaustManifoldIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 8H13C15.2 8 17 9.8 17 12C17 14.2 15.2 16 13 16H3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 12H19C20.1 12 21 12.9 21 14C21 15.1 20.1 16 19 16H9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 4H10C11.7 4 13 5.3 13 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 20H15C16.7 20 18 18.7 18 17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** 7. 28V Dual Bus Electrical Generator (Geometric Dynamo Stator Core) */
export function AlternatorDynamoIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12.5 6L8.5 12.5H13.5L11.5 18" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 8. AI DRDO Flight Copilot (Precision Tactical UAV Airframe / Guidance Node) */
export function TacticalCopilotIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <polygon points="12 2 21 8 21 16 12 22 3 16 3 8" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.2" fill={color} />
    </svg>
  );
}

/** 9. Forward Mission Survivability Simulation (Trajectory Vector) */
export function MissionForecastIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 20L10 13L14 17L21 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8H21V13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="3" cy="20" r="1.5" fill={color} />
      <circle cx="21" cy="8" r="1.5" fill={color} />
    </svg>
  );
}

/** 10. Live Telemetry Wave Tab Icon (Precision Oscilloscope Pulse Trace) */
export function LiveStreamWaveIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2 12H6L9 4L15 20L18 12H22" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 11. Residual Physics Delta Icon (Precision Geometric Delta Gauge) */
export function ResidualDeltaIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 3L3 20H21L12 3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 15H15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
