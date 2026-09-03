import { useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { type LiveTelemetryPacket } from "../types/telemetry";

export type RenderMode = "solid" | "flir" | "xray";
export type CameraPreset = "iso" | "top" | "side" | "front";

export interface SceneConfig {
  wireframe: boolean;
  autoRotate: boolean;
  rotationSpeed: number;
  particleDensity: number;
  paletteKey: string;
  selectedCylinder: number | null;
  activeFault: string | null;
  rpm: number;
  explodedView: boolean;
  renderMode?: RenderMode;
  cameraPreset?: CameraPreset;
}

// Aerospace Palettes
export const PALETTES: Record<string, { primary: string; secondary: string; accent: string; label: string; name: string }> = {
  isro: {
    primary: "#ea580c",
    secondary: "#0284c7",
    accent: "#10b981",
    label: "ISRO Telemetry",
    name: "ISRO Saffron",
  },
  nasa: {
    primary: "#0284c7",
    secondary: "#ef4444",
    accent: "#38bdf8",
    label: "NASA Mission Control",
    name: "NASA Blue",
  },
  titanium: {
    primary: "#475569",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    label: "CAD Titanium",
    name: "CAD Titanium",
  },
};

// Continuous FLIR Thermal Spectrum: Cold Blue -> Cyan -> Green -> Amber -> Fiery Red
function getFlirThermalColor(tempC: number): string {
  if (tempC < 140) return "#1e3a8a"; // Deep navy (cold)
  if (tempC < 170) return "#0284c7"; // Cyan
  if (tempC < 195) return "#10b981"; // Emerald nominal
  if (tempC < 220) return "#f59e0b"; // Caution amber
  return "#dc2626"; // Thermal runaway red
}

// ─── Individual Cylinder Assembly with Aerospace Details ───────────────────────

interface CylinderProps {
  id: number;
  groupRef: React.RefObject<THREE.Group | null>;
  position: [number, number, number];
  rotation: [number, number, number];
  tempC: number;
  egtC: number;
  isSelected: boolean;
  wireframe: boolean;
  renderMode: RenderMode;
  engineRpm: number;
  onSelect: (id: number) => void;
}

function PistonCylinder({
  id,
  groupRef,
  position,
  rotation,
  tempC,
  egtC,
  isSelected,
  wireframe,
  renderMode,
  engineRpm,
  onSelect,
}: CylinderProps) {
  const [hovered, setHovered] = useState(false);
  const pistonRef = useRef<THREE.Mesh>(null);
  const rodRef = useRef<THREE.Mesh>(null);

  const isOverheating = tempC > 195;
  const isCritical = tempC > 225;

  // Reciprocating internal piston motion in X-Ray mode
  useFrame(({ clock }) => {
    if (renderMode === "xray" && pistonRef.current && rodRef.current) {
      const speed = (engineRpm / 60) * Math.PI * 2 * 0.1;
      const phase = (id % 2 === 0 ? 0 : Math.PI);
      const stroke = Math.sin(clock.getElapsedTime() * speed + phase) * 0.28;
      pistonRef.current.position.y = 0.7 + stroke;
      rodRef.current.position.y = 0.35 + stroke * 0.5;
    }
  });

  // Material Colors based on Active Render Mode
  const barrelColor = useMemo(() => {
    if (renderMode === "flir") return getFlirThermalColor(tempC);
    if (renderMode === "xray") return "#94a3b8";
    return hovered ? "#475569" : "#334155";
  }, [renderMode, tempC, hovered]);

  const headColor = useMemo(() => {
    if (renderMode === "flir") return getFlirThermalColor(tempC);
    if (renderMode === "xray") return "#cbd5e1";
    if (isCritical) return "#dc2626";
    if (isOverheating) return "#ea580c";
    return "#64748b";
  }, [renderMode, tempC, isCritical, isOverheating]);

  const headEmissive = useMemo(() => {
    if (renderMode === "flir") return getFlirThermalColor(tempC);
    if (isCritical) return "#ef4444";
    if (isOverheating) return "#f97316";
    return "#000000";
  }, [renderMode, tempC, isCritical, isOverheating]);

  const headEmissiveIntensity = useMemo(() => {
    if (renderMode === "flir") return 0.5;
    if (isCritical) return 0.9;
    if (isOverheating) return 0.5;
    return 0.0;
  }, [renderMode, isCritical, isOverheating]);

  const isXray = renderMode === "xray";

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Cylinder Barrel Body (Machined Steel / Transparent X-Ray Glass) */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.25, 32]} />
        <meshStandardMaterial
          color={barrelColor}
          roughness={isXray ? 0.1 : 0.35}
          metalness={isXray ? 0.1 : 0.75}
          transparent={isXray}
          opacity={isXray ? 0.35 : 1.0}
          wireframe={wireframe}
        />
      </mesh>

      {/* Internal Reciprocating Piston Head (Revealed in X-Ray Mode) */}
      {isXray && (
        <>
          <mesh ref={pistonRef} position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.3, 24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh ref={rodRef} position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
          </mesh>
        </>
      )}

      {/* 9 Precision Thin CNC Cooling Fin Discs */}
      {[0.25, 0.37, 0.49, 0.61, 0.73, 0.85, 0.97, 1.09, 1.21].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.035, 32]} />
          <meshStandardMaterial
            color={renderMode === "flir" ? getFlirThermalColor(tempC) : "#94a3b8"}
            metalness={isXray ? 0.2 : 0.85}
            roughness={0.25}
            transparent={isXray}
            opacity={isXray ? 0.4 : 1.0}
            wireframe={wireframe}
          />
        </mesh>
      ))}

      {/* Cylinder Head (High-Conductivity Aeronautical Aluminum Casting) */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.64, 0.6, 0.45, 32]} />
        <meshStandardMaterial
          color={headColor}
          emissive={headEmissive}
          emissiveIntensity={headEmissiveIntensity}
          roughness={isXray ? 0.1 : 0.3}
          metalness={isXray ? 0.2 : 0.7}
          transparent={isXray}
          opacity={isXray ? 0.45 : 1.0}
          wireframe={wireframe}
        />
      </mesh>

      {/* Billet Aluminum Rocker Cover Box with Cylinder ID */}
      <mesh position={[0, 1.76, 0]}>
        <boxGeometry args={[0.54, 0.2, 0.54]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.85}
          roughness={0.2}
          wireframe={wireframe}
        />
      </mesh>

      {/* Dual Pushrod Tubes (Chrome Steel Running from Base to Rocker Box) */}
      <mesh position={[0.26, 0.85, 0.2]}>
        <cylinderGeometry args={[0.035, 0.035, 1.45, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[-0.26, 0.85, 0.2]}>
        <cylinderGeometry args={[0.035, 0.035, 1.45, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Dual Aviation Spark Plugs with High-Tension Orange Leads */}
      {/* Top Spark Plug */}
      <mesh position={[0.28, 1.5, 0.32]} rotation={[0.4, 0, 0.5]}>
        <cylinderGeometry args={[0.06, 0.06, 0.22, 16]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} />
      </mesh>
      {/* Bottom Spark Plug */}
      <mesh position={[-0.28, 1.5, -0.32]} rotation={[-0.4, 0, -0.5]}>
        <cylinderGeometry args={[0.06, 0.06, 0.22, 16]} />
        <meshStandardMaterial color="#ea580c" roughness={0.3} />
      </mesh>

      {/* Exhaust Runner Pipe (Tuned Stainless Steel Header) */}
      <mesh position={[0.42, 0.85, -0.22]} rotation={[0.4, 0.2, 0.8]}>
        <cylinderGeometry args={[0.12, 0.12, 0.85, 20]} />
        <meshStandardMaterial
          color={renderMode === "flir" ? getFlirThermalColor(egtC * 0.35) : (isOverheating ? "#ea580c" : "#475569")}
          emissive={isOverheating ? "#ea580c" : "#000000"}
          emissiveIntensity={isOverheating ? 0.7 : 0.0}
          roughness={0.4}
          metalness={0.8}
          wireframe={wireframe}
        />
      </mesh>

      {/* Chrome Intake Runner Manifold Tube */}
      <mesh position={[-0.42, 0.85, 0.22]} rotation={[-0.4, -0.2, -0.8]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Holographic Target Bracket when Selected */}
      {isSelected && (
        <group position={[0, 1.5, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.82, 0.03, 16, 36]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ─── 4-Cylinder Aero Piston Engine Assembly with Exploded View ──────────────────

function AeroPistonEngine({
  config,
  livePacket,
  onSelectCylinder,
}: {
  config: SceneConfig;
  livePacket: LiveTelemetryPacket | null;
  onSelectCylinder: (id: number) => void;
}) {
  const engineRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Group>(null);
  const crankRef = useRef<THREE.Group>(null);

  // Cylinder groups for smooth exploded view interpolation
  const cyl1Ref = useRef<THREE.Group>(null);
  const cyl2Ref = useRef<THREE.Group>(null);
  const cyl3Ref = useRef<THREE.Group>(null);
  const cyl4Ref = useRef<THREE.Group>(null);
  const propGroupRef = useRef<THREE.Group>(null);
  const coolerRef = useRef<THREE.Group>(null);
  const altRef = useRef<THREE.Group>(null);

  const currentExploded = useRef(0);
  const rpm = livePacket?.rpm || config.rpm || 2400;
  const renderMode: RenderMode = config.renderMode || "solid";
  const isXray = renderMode === "xray";

  useFrame((_, delta) => {
    // Spin propeller smoothly at scaled operational speed
    if (propRef.current) {
      const radPerSec = (rpm / 60) * Math.PI * 2 * 0.15;
      propRef.current.rotation.z += radPerSec * delta;
    }

    // Spin internal crankshaft in X-Ray mode
    if (crankRef.current && isXray) {
      const radPerSec = (rpm / 60) * Math.PI * 2 * 0.15;
      crankRef.current.rotation.z += radPerSec * delta;
    }

    // Smooth lerp for CAD Exploded View transition
    const targetExploded = config.explodedView ? 1.0 : 0.0;
    currentExploded.current = THREE.MathUtils.lerp(currentExploded.current, targetExploded, delta * 4.0);
    const exp = currentExploded.current;

    // Explode cylinders outward horizontally along boxer displacement axis
    if (cyl1Ref.current) cyl1Ref.current.position.x = 1.35 + exp * 1.3;
    if (cyl2Ref.current) cyl2Ref.current.position.x = -1.35 - exp * 1.3;
    if (cyl3Ref.current) cyl3Ref.current.position.x = 1.35 + exp * 1.3;
    if (cyl4Ref.current) cyl4Ref.current.position.x = -1.35 - exp * 1.3;

    // Explode propeller forward along thrust vector
    if (propGroupRef.current) propGroupRef.current.position.z = 1.85 + exp * 1.1;

    // Explode oil cooler downward
    if (coolerRef.current) coolerRef.current.position.y = -1.15 - exp * 0.9;

    // Explode alternator upward
    if (altRef.current) altRef.current.position.y = 1.05 + exp * 0.9;
  });

  const getCht = (cyl: number) => {
    if (!livePacket) return 160;
    const key = `E1_CHT${cyl}` as keyof typeof livePacket.channels;
    return (livePacket.channels[key] as number) || 160;
  };

  const getEgt = (cyl: number) => {
    if (!livePacket) return 640;
    const key = `E1_EGT${cyl}` as keyof typeof livePacket.channels;
    return (livePacket.channels[key] as number) || 640;
  };

  const isOilFault = livePacket?.stage2_fault === "oil_cooler_degradation";
  const isAltFault = livePacket?.stage2_fault === "alternator_rectifier_drift";

  return (
    <group ref={engineRef} position={[0, 0, 0]}>
      {/* ─── 1. Horizontally-Opposed Boxer Crankcase ────────────────────────── */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.55, 1.25, 2.45]} />
        <meshStandardMaterial
          color={isXray ? "#94a3b8" : "#64748b"}
          metalness={isXray ? 0.2 : 0.7}
          roughness={isXray ? 0.1 : 0.35}
          transparent={isXray}
          opacity={isXray ? 0.3 : 1.0}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Internal Rotating Steel Crankshaft (Visible in X-Ray Mode) */}
      {isXray && (
        <group ref={crankRef} position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 2.3, 20]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Crankshaft Counterweights */}
          {[-0.6, 0.0, 0.6].map((z, i) => (
            <mesh key={i} position={[0, 0.25, z]}>
              <boxGeometry args={[0.4, 0.25, 0.15]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
        </group>
      )}

      {/* Centerline Seam Split Flange with Hex Bolt Pattern */}
      <mesh position={[0, 0.64, 0]}>
        <boxGeometry args={[1.4, 0.08, 2.3]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Sump Pan (Oil Reservoir) */}
      <mesh position={[0, -0.78, 0]}>
        <boxGeometry args={[1.25, 0.42, 2.1]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.75}
          roughness={0.3}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Front Reduction Gearbox Nose Housing */}
      <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.52, 0.68, 0.5, 32]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ─── 2. 4 Precision Cylinders ────────────────────────────────────────── */}
      {/* Cyl 1 (Right Front) */}
      <PistonCylinder
        id={1}
        groupRef={cyl1Ref}
        position={[1.35, 0.1, 0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={getCht(1)}
        egtC={getEgt(1)}
        isSelected={config.selectedCylinder === 1}
        wireframe={config.wireframe}
        renderMode={renderMode}
        engineRpm={rpm}
        onSelect={onSelectCylinder}
      />

      {/* Cyl 2 (Left Front) */}
      <PistonCylinder
        id={2}
        groupRef={cyl2Ref}
        position={[-1.35, 0.1, 0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={getCht(2)}
        egtC={getEgt(2)}
        isSelected={config.selectedCylinder === 2}
        wireframe={config.wireframe}
        renderMode={renderMode}
        engineRpm={rpm}
        onSelect={onSelectCylinder}
      />

      {/* Cyl 3 (Right Rear) */}
      <PistonCylinder
        id={3}
        groupRef={cyl3Ref}
        position={[1.35, 0.1, -0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={getCht(3)}
        egtC={getEgt(3)}
        isSelected={config.selectedCylinder === 3}
        wireframe={config.wireframe}
        renderMode={renderMode}
        engineRpm={rpm}
        onSelect={onSelectCylinder}
      />

      {/* Cyl 4 (Left Rear) */}
      <PistonCylinder
        id={4}
        groupRef={cyl4Ref}
        position={[-1.35, 0.1, -0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={getCht(4)}
        egtC={getEgt(4)}
        isSelected={config.selectedCylinder === 4}
        wireframe={config.wireframe}
        renderMode={renderMode}
        engineRpm={rpm}
        onSelect={onSelectCylinder}
      />

      {/* ─── 3. Propeller & Spinner Drive Assembly ───────────────────────────── */}
      <group ref={propGroupRef} position={[0, 0, 1.85]}>
        {/* Mirror-Chrome Aerodynamic Spinner Nose Cone */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.42, 0.75, 36]} />
          <meshStandardMaterial
            color="#f8fafc"
            metalness={0.96}
            roughness={0.06}
            wireframe={config.wireframe}
          />
        </mesh>

        {/* Propeller Hub Flange with 6 Hex Fastener Studs */}
        <mesh position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.28, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Rotating Carbon-Fiber Propeller Blades */}
        <group ref={propRef} position={[0, 0, -0.06]}>
          {/* Blade 1 */}
          <mesh position={[0, 1.45, 0]} rotation={[0, 0.25, 0]}>
            <boxGeometry args={[0.24, 2.5, 0.05]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.4} />
          </mesh>
          {/* Blade 1 High-Vis Safety Tip */}
          <mesh position={[0, 2.55, 0]}>
            <boxGeometry args={[0.24, 0.32, 0.05]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>

          {/* Blade 2 */}
          <mesh position={[0, -1.45, 0]} rotation={[0, -0.25, 0]}>
            <boxGeometry args={[0.24, 2.5, 0.05]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.4} />
          </mesh>
          {/* Blade 2 High-Vis Safety Tip */}
          <mesh position={[0, -2.55, 0]}>
            <boxGeometry args={[0.24, 0.32, 0.05]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* ─── 4. Ancillaries: Oil Cooler, Alternator, Filter ─────────────────── */}
      {/* Oil Cooler Heat Exchanger Core (Bottom Mount with AN-8 Braided Lines) */}
      <group ref={coolerRef} position={[0, -1.15, 0.4]}>
        <mesh>
          <boxGeometry args={[1.05, 0.32, 0.75]} />
          <meshStandardMaterial
            color={isOilFault ? "#dc2626" : "#475569"}
            emissive={isOilFault ? "#dc2626" : "#000000"}
            emissiveIntensity={isOilFault ? 0.85 : 0.0}
            metalness={0.8}
            roughness={0.3}
            wireframe={config.wireframe}
          />
        </mesh>
        {/* Braided Oil Feed Lines with Anodized Fittings */}
        <mesh position={[0.42, 0.18, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.04, 0.04, 0.35, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.42, 0.18, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.04, 0.04, 0.35, 16]} />
          <meshStandardMaterial color="#dc2626" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Spin-On White Aeronautical Oil Filter Canister */}
      <mesh position={[0.72, -0.55, -0.5]} rotation={[0, 0, -Math.PI / 3]}>
        <cylinderGeometry args={[0.18, 0.18, 0.45, 24]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* 28V Dual Alternator Generator Unit (Top Front Mount) */}
      <group ref={altRef} position={[0, 1.0, 0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.55, 24]} />
          <meshStandardMaterial
            color={isAltFault ? "#d97706" : "#64748b"}
            emissive={isAltFault ? "#d97706" : "#000000"}
            emissiveIntensity={isAltFault ? 0.8 : 0.0}
            metalness={0.85}
            roughness={0.25}
            wireframe={config.wireframe}
          />
        </mesh>
      </group>

      {/* Atmospheric Exhaust Heat Shimmer Sparkles */}
      <Sparkles
        count={25}
        scale={[1.8, 1.2, 2.5]}
        position={[0, -0.4, -0.8]}
        speed={0.8}
        color="#f97316"
        size={2.5}
        opacity={0.6}
      />
    </group>
  );
}

// ─── Camera Perspective Controller (Smooth, Jitter-Free Preset Transitions) ─────

function CameraController({
  preset,
  controlsRef,
}: {
  preset?: CameraPreset;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(5.2, 3.6, 5.8));
  const isTransitioning = useRef(false);
  const prevPreset = useRef<CameraPreset | undefined>(undefined);

  useEffect(() => {
    // Only trigger transition if preset actually changes after initial mount
    if (preset && preset !== prevPreset.current) {
      if (preset === "top") targetPos.current.set(0, 8.5, 0.1);
      else if (preset === "side") targetPos.current.set(6.8, 0.8, 0);
      else if (preset === "front") targetPos.current.set(0, 0.6, 7.2);
      else if (preset === "iso") targetPos.current.set(5.2, 3.6, 5.8);

      isTransitioning.current = true;
      prevPreset.current = preset;
    }
  }, [preset]);

  useFrame((_, delta) => {
    // Only lerp while a preset transition is actively in progress; NEVER fight user mouse drag
    if (isTransitioning.current) {
      camera.position.lerp(targetPos.current, Math.min(1.0, delta * 4.5));
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.04) {
        camera.position.copy(targetPos.current);
        isTransitioning.current = false;
      }
    }
  });

  return null;
}

// ─── Root 3D Canvas Scene Viewport ──────────────────────────────────────────────

export function Scene3D({
  config,
  livePacket,
  onSelectCylinder,
}: {
  config: SceneConfig;
  livePacket: LiveTelemetryPacket | null;
  onSelectCylinder: (id: number) => void;
}) {
  const activePalette = PALETTES[config.paletteKey] || PALETTES.isro;
  const controlsRef = useRef<any>(null);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 select-none">
      <Canvas
        camera={{ position: [5.2, 3.6, 5.8], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        {/* Dynamic Camera Perspective Transition (Smooth & Conflict-Free) */}
        <CameraController preset={config.cameraPreset} controlsRef={controlsRef} />

        {/* Aerospace Cleanroom Studio Environment */}
        <color attach="background" args={["#f1f5f9"]} />
        <fog attach="fog" args={["#f1f5f9", 14, 35]} />

        {/* HDRI Studio Lighting Reflection Map */}
        <Environment preset="city" />

        {/* Studio Lighting Rig */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 16, 12]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-8, 6, -6]} intensity={0.95} color="#bae6fd" />
        <pointLight position={[0, 4, 3]} intensity={0.8} color={activePalette.secondary} />
        <pointLight position={[0, -2, -4]} intensity={0.5} color={activePalette.primary} />

        {/* Precision Test Cell Floor Grid */}
        <gridHelper args={[24, 24, "#94a3b8", "#cbd5e1"]} position={[0, -1.8, 0]} />

        {/* Ground Contact Shadows */}
        <ContactShadows
          position={[0, -1.79, 0]}
          opacity={0.7}
          scale={22}
          blur={2.5}
          far={5.0}
          color="#0f172a"
        />

        {/* 4-Cylinder Aero Piston Engine Digital Twin */}
        <AeroPistonEngine
          config={config}
          livePacket={livePacket}
          onSelectCylinder={onSelectCylinder}
        />

        {/* Smooth, Fluid Orbit Camera Controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.8}
          panSpeed={0.8}
          zoomSpeed={0.9}
          target={[0, 0, 0]}
          autoRotate={config.autoRotate}
          autoRotateSpeed={config.rotationSpeed}
          maxDistance={22}
          minDistance={2.2}
          onStart={() => {
            // Cancel any ongoing preset interpolation when user grabs the model
            if (controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
            }
          }}
        />
      </Canvas>
    </div>
  );
}
