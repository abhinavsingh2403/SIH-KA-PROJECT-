import { useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { type LiveTelemetryPacket } from "../types/telemetry";

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
}

// Aerospace & Mission Control Palettes (ISRO Saffron, NASA Blue, Titanium Gray)
export const PALETTES: Record<string, { primary: string; secondary: string; accent: string; label: string; name: string }> = {
  isro: {
    primary: "#ea580c",    // ISRO Rocket Saffron
    secondary: "#0284c7",  // ISRO Deep Sky Blue
    accent: "#10b981",     // Nominal Emerald
    label: "ISRO Telemetry",
    name: "ISRO Saffron",
  },
  nasa: {
    primary: "#0284c7",    // NASA Horizon Blue
    secondary: "#ef4444",  // NASA Vector Red
    accent: "#38bdf8",     // Apollo Cyan
    label: "NASA Mission Control",
    name: "NASA Blue",
  },
  titanium: {
    primary: "#475569",    // Aero Slate
    secondary: "#0ea5e9",  // Blue Neon
    accent: "#f59e0b",     // Amber Caution
    label: "CAD Titanium",
    name: "CAD Titanium",
  },
};

// ─── Individual Cylinder Assembly with Cooling Fins & Shaders ─────────────────

interface CylinderProps {
  id: number;
  groupRef: React.RefObject<THREE.Group | null>;
  position: [number, number, number];
  rotation: [number, number, number];
  tempC: number;
  isSelected: boolean;
  wireframe: boolean;
  onSelect: (id: number) => void;
}

function PistonCylinder({
  id,
  groupRef,
  position,
  rotation,
  tempC,
  isSelected,
  wireframe,
  onSelect,
}: CylinderProps) {
  const [hovered, setHovered] = useState(false);

  // Realistic thermal physics: Normal is clean machined alloy (#64748b).
  // Thermal glow ONLY activates during actual high-temperature overheating (> 195°C).
  const isOverheating = tempC > 195;
  const isCritical = tempC > 225;

  const headColor = useMemo(() => {
    if (isCritical) return "#dc2626";     // Red thermal runaway
    if (isOverheating) return "#ea580c";  // Orange high thermal stress
    return "#64748b";                     // Sleek aeronautical alloy
  }, [isOverheating, isCritical]);

  const emissiveGlow = useMemo(() => {
    if (isCritical) return "#ef4444";
    if (isOverheating) return "#f97316";
    return "#000000";
  }, [isOverheating, isCritical]);

  const emissiveIntensity = useMemo(() => {
    if (isCritical) return 0.85;
    if (isOverheating) return 0.45;
    return 0.0;
  }, [isOverheating, isCritical]);

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
      {/* Cylinder Barrel Body (Machined High-Strength Steel Alloy) */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.2, 32]} />
        <meshStandardMaterial
          color={hovered ? "#475569" : "#334155"}
          roughness={0.4}
          metalness={0.7}
          wireframe={wireframe}
        />
      </mesh>

      {/* 5 CNC Cooling Fin Discs (Polished Edges) */}
      {[0.3, 0.5, 0.7, 0.9, 1.1].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.04, 32]} />
          <meshStandardMaterial
            color="#94a3b8"
            metalness={0.85}
            roughness={0.25}
            wireframe={wireframe}
          />
        </mesh>
      ))}

      {/* Cylinder Head Chamber (Authentic Aeronautical Alloy with Thermal Glow) */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.62, 0.58, 0.4, 32]} />
        <meshStandardMaterial
          color={headColor}
          emissive={emissiveGlow}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.7}
          wireframe={wireframe}
        />
      </mesh>

      {/* Rocker Box & Valve Cover (Billet Aluminum) */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.85}
          roughness={0.2}
          wireframe={wireframe}
        />
      </mesh>

      {/* Selection Holographic Halo Ring */}
      {isSelected && (
        <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.75, 0.03, 16, 32]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      )}

      {/* Exhaust Runner Pipe */}
      <mesh position={[0.4, 0.8, -0.2]} rotation={[0.4, 0.2, 0.8]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8, 16]} />
        <meshStandardMaterial
          color={isOverheating ? "#ea580c" : "#64748b"}
          emissive={isOverheating ? "#ea580c" : "#000000"}
          emissiveIntensity={isOverheating ? 0.6 : 0.0}
          roughness={0.4}
          metalness={0.8}
          wireframe={wireframe}
        />
      </mesh>
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

  useFrame((_, delta) => {
    // Spin propeller smoothly at scaled operational speed
    if (propRef.current) {
      const radPerSec = (rpm / 60) * Math.PI * 2 * 0.15;
      propRef.current.rotation.z += radPerSec * delta;
    }

    // Smooth lerp for CAD Exploded View transition
    const targetExploded = config.explodedView ? 1.0 : 0.0;
    currentExploded.current = THREE.MathUtils.lerp(currentExploded.current, targetExploded, delta * 4.0);
    const exp = currentExploded.current;

    // Explode cylinders outward horizontally along boxer displacement axis
    if (cyl1Ref.current) cyl1Ref.current.position.x = 1.35 + exp * 1.2;
    if (cyl2Ref.current) cyl2Ref.current.position.x = -1.35 - exp * 1.2;
    if (cyl3Ref.current) cyl3Ref.current.position.x = 1.35 + exp * 1.2;
    if (cyl4Ref.current) cyl4Ref.current.position.x = -1.35 - exp * 1.2;

    // Explode propeller forward along thrust vector
    if (propGroupRef.current) propGroupRef.current.position.z = 1.8 + exp * 1.0;

    // Explode oil cooler downward
    if (coolerRef.current) coolerRef.current.position.y = -1.1 - exp * 0.8;

    // Explode alternator upward
    if (altRef.current) altRef.current.position.y = 1.0 + exp * 0.8;
  });

  const getCht = (cyl: number) => {
    if (!livePacket) return 160;
    const key = `E1_CHT${cyl}` as keyof typeof livePacket.channels;
    return (livePacket.channels[key] as number) || 160;
  };

  const isOilFault = livePacket?.stage2_fault === "oil_cooler_degradation";
  const isAltFault = livePacket?.stage2_fault === "alternator_rectifier_drift";

  return (
    <group ref={engineRef} position={[0, 0, 0]}>
      {/* Central Engine Crankcase Block (Aircraft Cast Aluminum - Clean Metal) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 1.2, 2.4]} />
        <meshStandardMaterial
          color="#64748b"
          metalness={0.7}
          roughness={0.35}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Crankcase Top Stiffening Ribs */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.3, 0.08, 2.2]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.8}
          roughness={0.3}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Sump Pan (Oil Reservoir) */}
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[1.2, 0.4, 2.0]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.75}
          roughness={0.3}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Cyl 1 (Right Front) */}
      <PistonCylinder
        id={1}
        groupRef={cyl1Ref}
        position={[1.35, 0.1, 0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={getCht(1)}
        isSelected={config.selectedCylinder === 1}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Cyl 2 (Left Front) */}
      <PistonCylinder
        id={2}
        groupRef={cyl2Ref}
        position={[-1.35, 0.1, 0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={getCht(2)}
        isSelected={config.selectedCylinder === 2}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Cyl 3 (Right Rear) */}
      <PistonCylinder
        id={3}
        groupRef={cyl3Ref}
        position={[1.35, 0.1, -0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={getCht(3)}
        isSelected={config.selectedCylinder === 3}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Cyl 4 (Left Rear) */}
      <PistonCylinder
        id={4}
        groupRef={cyl4Ref}
        position={[-1.35, 0.1, -0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={getCht(4)}
        isSelected={config.selectedCylinder === 4}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Propeller Drive Assembly */}
      <group ref={propGroupRef} position={[0, 0, 1.8]}>
        {/* Polished Propeller Spinner Dome */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 0.7, 32]} />
          <meshStandardMaterial
            color="#e2e8f0"
            metalness={0.9}
            roughness={0.15}
            wireframe={config.wireframe}
          />
        </mesh>

        {/* Propeller Shaft Collar */}
        <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.25, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Rotating Composite Propeller Blades */}
        <group ref={propRef} position={[0, 0, -0.05]}>
          {/* Blade 1 */}
          <mesh position={[0, 1.4, 0]} rotation={[0, 0.2, 0]}>
            <boxGeometry args={[0.22, 2.4, 0.05]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Blade 1 High-Vis Safety Tip */}
          <mesh position={[0, 2.45, 0]}>
            <boxGeometry args={[0.22, 0.3, 0.05]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>

          {/* Blade 2 */}
          <mesh position={[0, -1.4, 0]} rotation={[0, -0.2, 0]}>
            <boxGeometry args={[0.22, 2.4, 0.05]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Blade 2 High-Vis Safety Tip */}
          <mesh position={[0, -2.45, 0]}>
            <boxGeometry args={[0.22, 0.3, 0.05]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* Oil Cooler Heat Exchanger Core (Bottom Mount) */}
      <group ref={coolerRef} position={[0, -1.1, 0.4]}>
        <mesh>
          <boxGeometry args={[1.0, 0.3, 0.7]} />
          <meshStandardMaterial
            color={isOilFault ? "#dc2626" : "#475569"}
            emissive={isOilFault ? "#dc2626" : "#000000"}
            emissiveIntensity={isOilFault ? 0.85 : 0.0}
            metalness={0.8}
            roughness={0.3}
            wireframe={config.wireframe}
          />
        </mesh>
      </group>

      {/* 28V Alternator Generator Unit (Top Front Mount) */}
      <group ref={altRef} position={[0, 0.95, 0.6]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.5, 24]} />
          <meshStandardMaterial
            color={isAltFault ? "#d97706" : "#64748b"}
            emissive={isAltFault ? "#d97706" : "#000000"}
            emissiveIntensity={isAltFault ? 0.75 : 0.0}
            metalness={0.85}
            roughness={0.25}
            wireframe={config.wireframe}
          />
        </mesh>
      </group>
    </group>
  );
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

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100">
      <Canvas
        camera={{ position: [5.2, 3.6, 5.8], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        {/* Aerospace Cleanroom Studio Environment */}
        <color attach="background" args={["#f1f5f9"]} />
        <fog attach="fog" args={["#f1f5f9", 14, 35]} />

        {/* HDRI Studio Lighting Reflection Map - Eliminates Pitch Black Void */}
        <Environment preset="city" />

        {/* Studio Lighting Rig */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[10, 15, 12]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[-8, 6, -6]} intensity={0.9} color="#bae6fd" />
        <pointLight position={[0, 4, 3]} intensity={0.8} color={activePalette.secondary} />
        <pointLight position={[0, -2, -4]} intensity={0.5} color={activePalette.primary} />

        {/* Test Cell Ground Bench Grid */}
        <gridHelper args={[24, 24, "#94a3b8", "#cbd5e1"]} position={[0, -1.8, 0]} />

        {/* Ground Contact Shadows */}
        <ContactShadows
          position={[0, -1.79, 0]}
          opacity={0.65}
          scale={20}
          blur={2.0}
          far={4.5}
          color="#0f172a"
        />

        {/* 4-Cylinder Aero Engine Digital Twin (Rigidly Bolted) */}
        <AeroPistonEngine
          config={config}
          livePacket={livePacket}
          onSelectCylinder={onSelectCylinder}
        />

        {/* Smooth Orbit Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={config.autoRotate}
          autoRotateSpeed={config.rotationSpeed}
          maxDistance={22}
          minDistance={2.2}
        />
      </Canvas>
    </div>
  );
}
