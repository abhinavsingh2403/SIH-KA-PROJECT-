interface AerospaceIconProps {
  className?: string;
  size?: number;
  color?: string;
}

/** 1. Mission Flight Debrief & Sortie Telemetry Log (Tactical Clipboard with Flight Plan Vector) */
export function DebriefTacticalIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Flight Dossier Clipboard Frame */}
      <rect x="4" y="4" width="16" height="17" rx="1.5" stroke={color} strokeWidth="1.6" />
      {/* Metallic Binder Clip */}
      <path d="M8 4V2.5C8 2.22 8.22 2 8.5 2H15.5C15.78 2 16 2.22 16 2.5V4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Tactical Aircraft Heading Waypoint Mark */}
      <path d="M8 9H16" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 13H13" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Telemetry Checkmark Seal */}
      <path d="M14 16.5L15.5 18L18.5 15" stroke="#0B8F46" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 2. Real-Time Telemetry Cloud Database & Mission Storage (Solid Storage Cylinder Array with Bus Uplink) */
export function DatabaseUplinkIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Upper Telemetry Drive Platter */}
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke={color} strokeWidth="1.6" />
      {/* Middle Database Tier */}
      <path d="M4 6V12C4 13.66 7.58 15 12 15C16.42 15 20 13.66 20 12V6" stroke={color} strokeWidth="1.6" />
      {/* Lower Cold Storage Tier */}
      <path d="M4 12V18C4 19.66 7.58 21 12 21C16.42 21 20 19.66 20 18V12" stroke={color} strokeWidth="1.6" />
      {/* Avionics Bus Pulse LED */}
      <circle cx="17" cy="12" r="1" fill="#FF681F" />
      <circle cx="17" cy="18" r="1" fill="#0B8F46" />
    </svg>
  );
}

/** 3. Federated Fleet Learning (Federated UAV Network Constellation Nodes) */
export function FleetMeshIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Core Aggregator Station (FedAvg Hub) */}
      <circle cx="12" cy="7" r="2.8" stroke={color} strokeWidth="1.6" fill="#FFF4ED" />
      {/* Satellite UAV Node Alpha */}
      <circle cx="6" cy="17" r="2.4" stroke={color} strokeWidth="1.5" />
      {/* Satellite UAV Node Beta */}
      <circle cx="18" cy="17" r="2.4" stroke={color} strokeWidth="1.5" />
      {/* Encrypted Model Sync Vectors */}
      <path d="M8.2 15.2L10.5 9.5" stroke="#FF681F" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
      <path d="M15.8 15.2L13.5 9.5" stroke="#0B8F46" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
      <path d="M8.5 17H15.5" stroke={color} strokeWidth="1.3" strokeDasharray="2 2" />
    </svg>
  );
}

/** 4. Cylinder Head Thermal Combustion (High-Temperature Cylinder Flame Chamber) */
export function CylinderCombustionIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Cylinder Barrel Fin Guides */}
      <path d="M5 6H19M5 10H19M5 14H19" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
      {/* Spark Plug Electrode Arc */}
      <path d="M12 2V6" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
      {/* High-Enthalpy Combustion Flame */}
      <path
        d="M12 7C12 7 9 10.5 9 14C9 16.5 10.3 19 12 19C13.7 19 15 16.5 15 14C15 10.5 12 7 12 7Z"
        fill="#FF681F"
        stroke="#E11D48"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 13C12 13 10.8 15 10.8 16.2C10.8 17.2 11.3 18 12 18C12.7 18 13.2 17.2 13.2 16.2C13.2 15 12 13 12 13Z" fill="#FFF7ED" />
    </svg>
  );
}

/** 5. Engine Lubrication & Oil Viscosity Dynamics (Aero Oil Pump Rotor / Droplet) */
export function LubricationCircuitIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Oil Pressure Gauge Arc */}
      <path d="M4 14C4 8.5 8 4 12 4C16 4 20 8.5 20 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      {/* Viscous Synthetic Oil Droplet */}
      <path
        d="M12 7C12 7 7.5 13 7.5 16.2C7.5 19 9.5 21 12 21C14.5 21 16.5 19 16.5 16.2C16.5 13 12 7 12 7Z"
        fill="#FFF4ED"
        stroke="#FF681F"
        strokeWidth="1.6"
      />
      {/* Internal Viscosity Wave */}
      <path d="M9.5 16.5C10.5 15.8 13.5 15.8 14.5 16.5" stroke="#0B8F46" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 6. Exhaust Gas Temperature & Manifold Dynamics (High-Velocity Manifold Exhaust Wave) */
export function ExhaustManifoldIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Exhaust Runner Pipes */}
      <path d="M4 5C8 5 9 8 9 12V20" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 5C16 5 15 8 15 12V20" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Thermal Velocity Dispersion Wave */}
      <path d="M7 16C9 14.5 15 14.5 17 16" stroke="#FF681F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 19C10 18 14 18 15.5 19" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" />
      {/* Sensor Probe Well */}
      <circle cx="12" cy="8" r="2.2" stroke="#0284C7" strokeWidth="1.5" fill="#EAF7EF" />
    </svg>
  );
}

/** 7. 28V Dual Bus Electrical Generator (High-Voltage Alternator Dynamo Stator) */
export function AlternatorDynamoIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Stator Casing Housing */}
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.6" />
      {/* Armature Rotor Coils */}
      <circle cx="12" cy="12" r="4.5" stroke="#FF681F" strokeWidth="1.3" strokeDasharray="3 2" />
      {/* High-Voltage Direct Current Lightning Bolt */}
      <path d="M12.5 6.5L10 12.5H14L11.5 17.5" stroke="#0B8F46" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dual Bus Contacts */}
      <circle cx="5" cy="5" r="1.5" fill="#2F3E46" />
      <circle cx="19" cy="5" r="1.5" fill="#2F3E46" />
    </svg>
  );
}

/** 8. AI DRDO Flight Copilot Radar (Autonomous Tactical Aerospace Drone Sensor) */
export function TacticalCopilotIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* UAV Drone Fuselage Silhouette */}
      <path d="M12 3L14 8H19L15 12L16.5 18L12 15L7.5 18L9 12L5 8H10L12 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Neural AI Scanning Gimbal Core */}
      <circle cx="12" cy="11.5" r="2" fill="#FF681F" />
      {/* Forward FLIR Radar Arc */}
      <path d="M8 20C10 21.5 14 21.5 16 20" stroke="#0B8F46" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** 9. Forward Mission Survivability Simulation (Trajectory Prediction Cone) */
export function MissionForecastIcon({ className = "w-3.5 h-3.5", size = 14, color = "currentColor" }: AerospaceIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Origin Sortie Waypoint */}
      <circle cx="5" cy="18" r="2" stroke={color} strokeWidth="1.5" fill="#FFF4ED" />
      {/* Monte-Carlo Dispersion Cone */}
      <path d="M7 17L18 8M7 17L19 14M7 17L14 7" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" opacity="0.6" />
      {/* Primary Survivability Flight Corridor */}
      <path d="M5 18C9 17 12 12 18 8" stroke="#0B8F46" strokeWidth="2" strokeLinecap="round" />
      {/* Predicted Mission Horizon Target */}
      <circle cx="18" cy="8" r="2.5" stroke="#FF681F" strokeWidth="1.6" fill="#FFFFFF" />
    </svg>
  );
}
