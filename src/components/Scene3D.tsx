import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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

export const PALETTES: Record<string, { primary: string; secondary: string; glow: string; name: string }> = {
  isro: {
    name: "ISRO Mission Control",
    primary: "#ea580c", // ISRO Rocket Saffron
    secondary: "#0284c7", // Aerospace Sky Blue
    glow: "#f97316",
  },
  nasa: {
    name: "NASA Deep Blue",
    primary: "#0f172a", // NASA Navy
    secondary: "#0284c7", // Precision Sky
    glow: "#38bdf8",
  },
  defense: {
    name: "DRDO Defense Titanium",
    primary: "#334155", // Titanium Armor
    secondary: "#059669", // Avionics Emerald
    glow: "#10b981",
  },
};

// ─── Piston Cylinder Unit ───────────────────────────────────────────────────────

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
  const thermalColor = useMemo(() => {
    if (tempC > 230) return "#ef4444";
    if (tempC > 190) return "#f59e0b";
    return "#10b981";
  }, [tempC]);

  const emissiveIntensity = useMemo(() => {
    if (tempC > 230) return 0.95;
    if (tempC > 190) return 0.55;
    return 0.15;
  }, [tempC]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {/* Cylinder Barrel with Cooling Fins */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 1.2, 32]} />
        <meshStandardMaterial
          color={isSelected ? "#38bdf8" : "#334155"}
          roughness={0.4}
          metalness={0.8}
          wireframe={wireframe}
        />
      </mesh>

      {/* 5 Cooling Fin Discs */}
      {[0.3, 0.5, 0.7, 0.9, 1.1].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.04, 32]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.9}
            roughness={0.3}
            wireframe={wireframe}
          />
        </mesh>
      ))}

      {/* Cylinder Head (Thermal Hotspot) */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.62, 0.58, 0.4, 32]} />
        <meshStandardMaterial
          color={thermalColor}
          emissive={thermalColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.7}
          wireframe={wireframe}
        />
      </mesh>

      {/* Spark Plug & Rocker Cover */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial
          color={isSelected ? "#38bdf8" : "#64748b"}
          metalness={0.8}
          wireframe={wireframe}
        />
      </mesh>

      {/* Exhaust Runner Pipe */}
      <mesh position={[0.4, 0.8, -0.2]} rotation={[0.4, 0.2, 0.8]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8, 16]} />
        <meshStandardMaterial
          color={tempC > 200 ? "#f97316" : "#475569"}
          emissive={tempC > 200 ? "#f97316" : "#000000"}
          emissiveIntensity={tempC > 200 ? 0.6 : 0.0}
          roughness={0.5}
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
  const propAssemblyRef = useRef<THREE.Group>(null);
  const coolerRef = useRef<THREE.Mesh>(null);
  const altRef = useRef<THREE.Mesh>(null);

  const cyl1Ref = useRef<THREE.Group>(null);
  const cyl2Ref = useRef<THREE.Group>(null);
  const cyl3Ref = useRef<THREE.Group>(null);
  const cyl4Ref = useRef<THREE.Group>(null);

  const currentExploded = useRef(0);

  // Dynamic CHT temperatures (from live packet or fallback calculation)
  const chts = useMemo(() => {
    if (livePacket?.channels) {
      return [
        livePacket.channels.E1_CHT1,
        livePacket.channels.E1_CHT2,
        livePacket.channels.E1_CHT3,
        livePacket.channels.E1_CHT4,
      ];
    }
    const base = [165, 158, 168, 155];
    if (config.activeFault === "cylinder_head_overheat") {
      base[1] += 85;
    } else if (config.activeFault === "oil_cooler_degradation") {
      base[0] += 30;
      base[1] += 35;
      base[2] += 32;
      base[3] += 30;
    }
    return base;
  }, [livePacket, config.activeFault]);

  const liveRPM = livePacket?.rpm || config.rpm;

  // Frame Loop: Propeller rotation & Smooth Exploded View animation
  useFrame((_, delta) => {
    // 1. Propeller spin
    if (propRef.current) {
      const radPerSec = (liveRPM / 60) * 2 * Math.PI * 0.15;
      propRef.current.rotation.z -= delta * radPerSec;
    }

    // 2. Smooth Exploded View interpolation
    const targetOffset = config.explodedView ? 1.0 : 0.0;
    currentExploded.current = THREE.MathUtils.lerp(currentExploded.current, targetOffset, delta * 5.0);
    const offset = currentExploded.current;

    if (cyl1Ref.current) cyl1Ref.current.position.set(-0.8 - offset * 1.2, 0.1, 0.6);
    if (cyl2Ref.current) cyl2Ref.current.position.set(0.8 + offset * 1.2, 0.1, 0.6);
    if (cyl3Ref.current) cyl3Ref.current.position.set(-0.8 - offset * 1.2, 0.1, -0.6);
    if (cyl4Ref.current) cyl4Ref.current.position.set(0.8 + offset * 1.2, 0.1, -0.6);

    if (propAssemblyRef.current) propAssemblyRef.current.position.set(0, 0, 1.4 + offset * 1.2);
    if (coolerRef.current) coolerRef.current.position.set(0, 0.9 + offset * 0.8, 0.4);
    if (altRef.current) altRef.current.position.set(0, -0.1, -1.5 - offset * 1.0);
  });

  const isOilFault = config.activeFault === "oil_cooler_degradation" || (livePacket?.stage2_fault === "oil_cooler_degradation");
  const isAltFault = config.activeFault === "alternator_rectifier_drift" || (livePacket?.stage2_fault === "alternator_rectifier_drift");

  return (
    <group ref={engineRef} position={[0, 0, 0]}>
      {/* Central Crankcase */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.4, 1.2, 2.4]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.5}
          metalness={0.85}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Sump / Oil Pan */}
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[1.0, 0.45, 1.8]} />
        <meshStandardMaterial
          color={isOilFault ? "#dc2626" : "#0f172a"}
          emissive={isOilFault ? "#ef4444" : "#000000"}
          emissiveIntensity={isOilFault ? 0.7 : 0.0}
          roughness={0.4}
          metalness={0.9}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Front Nose Cone + Propeller Assembly */}
      <group ref={propAssemblyRef} position={[0, 0, 1.4]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.45, 0.7, 32]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.9} wireframe={config.wireframe} />
        </mesh>

        <group ref={propRef} position={[0, 0, 0.35]}>
          <mesh>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#0284c7" metalness={0.9} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.18, 2.6, 0.03]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, -1.5, 0]}>
            <boxGeometry args={[0.18, 2.6, 0.03]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* 4 Horizontally-Opposed Boxer Cylinders */}
      <PistonCylinder
        id={1}
        groupRef={cyl1Ref}
        position={[-0.8, 0.1, 0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={chts[0]}
        isSelected={config.selectedCylinder === 1}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      <PistonCylinder
        id={2}
        groupRef={cyl2Ref}
        position={[0.8, 0.1, 0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={chts[1]}
        isSelected={config.selectedCylinder === 2}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      <PistonCylinder
        id={3}
        groupRef={cyl3Ref}
        position={[-0.8, 0.1, -0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={chts[2]}
        isSelected={config.selectedCylinder === 3}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      <PistonCylinder
        id={4}
        groupRef={cyl4Ref}
        position={[0.8, 0.1, -0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={chts[3]}
        isSelected={config.selectedCylinder === 4}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Front Oil Cooler Radiator Matrix */}
      <mesh ref={coolerRef} position={[0, 0.9, 0.4]}>
        <boxGeometry args={[0.9, 0.4, 0.15]} />
        <meshStandardMaterial
          color={isOilFault ? "#f43f5e" : "#06b6d4"}
          emissive={isOilFault ? "#f43f5e" : "#06b6d4"}
          emissiveIntensity={isOilFault ? 0.8 : 0.2}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Rear Alternator Unit */}
      <mesh ref={altRef} position={[0, -0.1, -1.5]}>
        <cylinderGeometry args={[0.35, 0.35, 0.6, 24]} />
        <meshStandardMaterial
          color={isAltFault ? "#eab308" : "#64748b"}
          emissive={isAltFault ? "#facc15" : "#000000"}
          emissiveIntensity={isAltFault ? 0.7 : 0.0}
          wireframe={config.wireframe}
        />
      </mesh>
    </group>
  );
}

// ─── Scene3D Main Export ────────────────────────────────────────────────────────

export function Scene3D({
  config,
  livePacket = null,
  onSelectCylinder,
}: {
  config: SceneConfig;
  livePacket?: LiveTelemetryPacket | null;
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

        {/* Studio Lighting Rig */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 15, 12]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-8, 6, -6]} intensity={0.9} color="#bae6fd" />
        <pointLight position={[0, 4, 3]} intensity={1.0} color={activePalette.secondary} />
        <pointLight position={[0, -2, -4]} intensity={0.6} color={activePalette.primary} />

        {/* Test Cell Ground Bench Grid */}
        <gridHelper args={[24, 24, "#94a3b8", "#cbd5e1"]} position={[0, -1.8, 0]} />

        {/* 4-Cylinder Aero Engine Digital Twin (Rigidly Mounted) */}
        <AeroPistonEngine
          config={config}
          livePacket={livePacket}
          onSelectCylinder={onSelectCylinder}
        />

        {/* Orbit Camera Controls */}
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
