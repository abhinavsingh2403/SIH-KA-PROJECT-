interface AerospaceIconProps {
  className?: string;
  size?: number;
  color?: string;
}

/** 1. Mission Flight Debrief & Sortie Telemetry Log */
export function DebriefTacticalIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke={color} strokeWidth="1.6" fill="#FFF9F5" />
      <path d="M8 3.5V2C8 1.7 8.2 1.5 8.5 1.5H15.5C15.8 1.5 16 1.7 16 2V3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 8.5H16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 12H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16.5" cy="15.5" r="3.5" fill="#0B8F46" />
      <path d="M15 15.5L16.2 16.7L18.2 14.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 2. Real-Time Telemetry Cloud Database & Mission Storage */
export function DatabaseUplinkIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="12" cy="5.5" rx="8.5" ry="3" stroke={color} strokeWidth="1.6" fill="#F0FDF4" />
      <path d="M3.5 5.5V11.5C3.5 13.16 7.3 14.5 12 14.5C16.7 14.5 20.5 13.16 20.5 11.5V5.5" stroke={color} strokeWidth="1.6" />
      <path d="M3.5 11.5V17.5C3.5 19.16 7.3 20.5 12 20.5C16.7 20.5 20.5 19.16 20.5 17.5V11.5" stroke={color} strokeWidth="1.6" />
      <circle cx="17" cy="11.5" r="1.2" fill="#FF681F" />
      <circle cx="17" cy="17.5" r="1.2" fill="#0B8F46" />
      <path d="M7 11.5H12" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M7 17.5H11" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** 3. Federated Fleet Learning (UAV Constellation Mesh) */
export function FleetMeshIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="6" r="3.2" stroke={color} strokeWidth="1.6" fill="#FFF4ED" />
      <circle cx="5" cy="18" r="2.8" stroke={color} strokeWidth="1.5" fill="#F1F5F9" />
      <circle cx="19" cy="18" r="2.8" stroke={color} strokeWidth="1.5" fill="#F1F5F9" />
      <path d="M7.5 16L10.2 8.5" stroke="#FF681F" strokeWidth="1.6" strokeDasharray="2 1.5" />
      <path d="M16.5 16L13.8 8.5" stroke="#0B8F46" strokeWidth="1.6" strokeDasharray="2 1.5" />
      <path d="M7.8 18H16.2" stroke={color} strokeWidth="1.4" strokeDasharray="1.5 1.5" />
      <circle cx="12" cy="6" r="1" fill="#FF681F" />
    </svg>
  );
}

/** 4. Cylinder Head Thermal Combustion */
export function CylinderCombustionIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 6H20M4 10H20M4 14H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <rect x="6" y="4" width="12" height="15" rx="1" stroke={color} strokeWidth="1.6" />
      <path d="M12 1.5V4" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M12 7C12 7 8.5 11 8.5 14C8.5 16.5 10 18.5 12 18.5C14 18.5 15.5 16.5 15.5 14C15.5 11 12 7 12 7Z"
        fill="#FF681F"
        stroke="#E11D48"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="14.5" r="1.5" fill="#FFF7ED" />
    </svg>
  );
}

/** 5. Engine Lubrication & Oil Viscosity Dynamics */
export function LubricationCircuitIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
      <path
        d="M12 5.5C12 5.5 6.5 12.5 6.5 16C6.5 19.2 8.9 21.5 12 21.5C15.1 21.5 17.5 19.2 17.5 16C17.5 12.5 12 5.5 12 5.5Z"
        fill="#FFF4ED"
        stroke="#FF681F"
        strokeWidth="1.8"
      />
      <path d="M9 16.5C10.2 15.5 13.8 15.5 15 16.5" stroke="#0B8F46" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12.5" r="1.5" fill="#FF681F" />
    </svg>
  );
}

/** 6. Exhaust Gas Temperature & Manifold Dynamics */
export function ExhaustManifoldIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 4C7 4 8.5 7 8.5 11V20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 4C17 4 15.5 7 15.5 11V20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 15.5C8.5 14 15.5 14 18 15.5" stroke="#FF681F" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 18.5C10 17.2 14 17.2 16 18.5" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="2.4" stroke="#0284C7" strokeWidth="1.6" fill="#EAF7EF" />
    </svg>
  );
}

/** 7. 28V Dual Bus Electrical Generator */
export function AlternatorDynamoIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" fill="#F8FAFC" />
      <circle cx="12" cy="12" r="5" stroke="#FF681F" strokeWidth="1.4" strokeDasharray="3 2" />
      <path d="M12.8 6.5L9.8 12.5H14.2L11.2 17.5" stroke="#0B8F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="4.5" cy="4.5" r="1.5" fill="#2F3E46" />
      <circle cx="19.5" cy="4.5" r="1.5" fill="#2F3E46" />
    </svg>
  );
}

/** 8. AI DRDO Flight Copilot Radar */
export function TacticalCopilotIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2.5L14.5 8H20L15.5 12L17.2 18.5L12 15.2L6.8 18.5L8.5 12L4 8H9.5L12 2.5Z" stroke={color} strokeWidth="1.6" fill="#F0FDF4" strokeLinejoin="round" />
      <circle cx="12" cy="11.5" r="2.2" fill="#FF681F" />
      <path d="M7 21C10 22.5 14 22.5 17 21" stroke="#0B8F46" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** 9. Forward Mission Survivability Simulation */
export function MissionForecastIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="4.5" cy="18.5" r="2" stroke={color} strokeWidth="1.6" fill="#FFF4ED" />
      <path d="M6.5 17.5L18.5 7.5M6.5 17.5L19.5 13.5M6.5 17.5L14.5 6.5" stroke={color} strokeWidth="1.3" strokeDasharray="2 2" opacity="0.5" />
      <path d="M4.5 18.5C9 17.5 12.5 12 18.5 7.5" stroke="#0B8F46" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18.5" cy="7.5" r="2.8" stroke="#FF681F" strokeWidth="1.8" fill="#FFFFFF" />
      <circle cx="18.5" cy="7.5" r="1.2" fill="#FF681F" />
    </svg>
  );
}

/** 10. Live Telemetry Wave Tab Icon */
export function LiveStreamWaveIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 13H6.5L8.5 7L12 18L15.5 10L17.5 13H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="18" r="1.5" fill="#FF681F" />
    </svg>
  );
}

/** 11. Residual Physics Delta Icon */
export function ResidualDeltaIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Mathematical Greek Delta Δ symbol */}
      <path d="M12 4L4 19H20L12 4Z" stroke={color} strokeWidth="1.8" fill="#EAF7EF" strokeLinejoin="round" />
      {/* Divergence measurement bar */}
      <path d="M9 15L15 15" stroke="#FF681F" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
