import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import * as THREE from "three";

export interface SceneConfig {
  wireframe: boolean;
  autoRotate: boolean;
  rotationSpeed: number;
  particleDensity: number;
  paletteKey: string;
  selectedCylinder: number | null;
  activeFault: string | null;
  rpm: number;
}

export const PALETTES: Record<string, { primary: string; secondary: string; glow: string; name: string }> = {
  cyber: {
    name: "Midnight Cyber Neon",
    primary: "#8b5cf6",
    secondary: "#06b6d4",
    glow: "#f43f5e",
  },
  gold: {
    name: "Luxury Onyx & Gold",
    primary: "#d97706",
    secondary: "#f59e0b",
    glow: "#fbbf24",
  },
  emerald: {
    name: "Nordic Emerald",
    primary: "#10b981",
    secondary: "#38bdf8",
    glow: "#34d399",
  },
  synthwave: {
    name: "Tokyo Synthwave",
    primary: "#ff2a85",
    secondary: "#00f0ff",
    glow: "#ffb800",
  },
  cosmic: {
    name: "Ethereal Cosmic Void",
    primary: "#6366f1",
    secondary: "#a855f7",
    glow: "#14b8a6",
  },
};

// ─── Piston Cylinder Unit (Horizontally-Opposed Boxer) ──────────────────────────

interface CylinderProps {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  tempC: number;
  isSelected: boolean;
  wireframe: boolean;
  onSelect: (id: number) => void;
}

function PistonCylinder({
  id,
  position,
  rotation,
  tempC,
  isSelected,
  wireframe,
  onSelect,
}: CylinderProps) {
  const meshRef = useRef<THREE.Group>(null);

  // Compute thermal color gradient based on CHT
  // Normal: < 190°C (green/cyan) | Caution: 190-230°C (amber) | Critical: > 230°C (crimson)
  const thermalColor = useMemo(() => {
    if (tempC > 230) return "#ef4444"; // critical red
    if (tempC > 190) return "#f59e0b"; // caution amber
    return "#10b981"; // nominal emerald
  }, [tempC]);

  const emissiveIntensity = useMemo(() => {
    if (tempC > 230) return 0.9;
    if (tempC > 190) return 0.5;
    return 0.15;
  }, [tempC]);

  return (
    <group
      ref={meshRef}
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

// ─── 4-Cylinder Aero Piston Engine Assembly ─────────────────────────────────────

function AeroPistonEngine({
  config,
  onSelectCylinder,
}: {
  config: SceneConfig;
  onSelectCylinder: (id: number) => void;
}) {
  const engineRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Group>(null);

  // Compute live simulated temperatures
  const chts = useMemo(() => {
    const base = [165, 158, 168, 155];
    if (config.activeFault === "cylinder_head_overheat") {
      base[1] += 85; // Cylinder 2 thermal runaway
    } else if (config.activeFault === "oil_cooler_degradation") {
      base[0] += 30;
      base[1] += 35;
      base[2] += 32;
      base[3] += 30;
    }
    return base;
  }, [config.activeFault]);

  // Propeller spin animation coupled to engine RPM
  useFrame((_, delta) => {
    if (propRef.current) {
      const radPerSec = (config.rpm / 60) * 2 * Math.PI * 0.15;
      propRef.current.rotation.z -= delta * radPerSec;
    }
  });

  return (
    <group ref={engineRef} position={[0, 0, 0]}>
      {/* Central Cast Aluminum Crankcase */}
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
          color={config.activeFault === "oil_cooler_degradation" ? "#dc2626" : "#0f172a"}
          emissive={config.activeFault === "oil_cooler_degradation" ? "#ef4444" : "#000000"}
          emissiveIntensity={config.activeFault === "oil_cooler_degradation" ? 0.7 : 0.0}
          roughness={0.4}
          metalness={0.9}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Front Nose Cone / Propeller Hub */}
      <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.45, 0.7, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.2}
          metalness={0.9}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Rotating 2-Blade UAV Propeller */}
      <group ref={propRef} position={[0, 0, 1.75]}>
        {/* Hub */}
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} />
        </mesh>
        {/* Blade 1 */}
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.18, 2.6, 0.03]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Blade 2 */}
        <mesh position={[0, -1.5, 0]}>
          <boxGeometry args={[0.18, 2.6, 0.03]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* 4 Horizontally-Opposed Boxer Cylinders */}
      {/* Cylinder 1: Left-Front */}
      <PistonCylinder
        id={1}
        position={[-0.8, 0.1, 0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={chts[0]}
        isSelected={config.selectedCylinder === 1}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Cylinder 2: Right-Front (Targeted in overheat test) */}
      <PistonCylinder
        id={2}
        position={[0.8, 0.1, 0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={chts[1]}
        isSelected={config.selectedCylinder === 2}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Cylinder 3: Left-Rear */}
      <PistonCylinder
        id={3}
        position={[-0.8, 0.1, -0.6]}
        rotation={[0, 0, Math.PI / 2]}
        tempC={chts[2]}
        isSelected={config.selectedCylinder === 3}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Cylinder 4: Right-Rear */}
      <PistonCylinder
        id={4}
        position={[0.8, 0.1, -0.6]}
        rotation={[0, 0, -Math.PI / 2]}
        tempC={chts[3]}
        isSelected={config.selectedCylinder === 4}
        wireframe={config.wireframe}
        onSelect={onSelectCylinder}
      />

      {/* Front Oil Cooler Radiator Matrix */}
      <mesh position={[0, 0.9, 0.4]}>
        <boxGeometry args={[0.9, 0.4, 0.15]} />
        <meshStandardMaterial
          color={config.activeFault === "oil_cooler_degradation" ? "#f43f5e" : "#06b6d4"}
          emissive={config.activeFault === "oil_cooler_degradation" ? "#f43f5e" : "#06b6d4"}
          emissiveIntensity={config.activeFault === "oil_cooler_degradation" ? 0.8 : 0.2}
          wireframe={config.wireframe}
        />
      </mesh>

      {/* Rear Accessory Gearbox / Alternator Unit */}
      <mesh position={[0, -0.1, -1.5]}>
        <cylinderGeometry args={[0.35, 0.35, 0.6, 24]} />
        <meshStandardMaterial
          color={config.activeFault === "alternator_rectifier_drift" ? "#eab308" : "#64748b"}
          emissive={config.activeFault === "alternator_rectifier_drift" ? "#facc15" : "#000000"}
          emissiveIntensity={config.activeFault === "alternator_rectifier_drift" ? 0.7 : 0.0}
          wireframe={config.wireframe}
        />
      </mesh>
    </group>
  );
}

// ─── Ambient Particle Cloud ─────────────────────────────────────────────────────

function ParticleSwarm({ count, color }: { count: number; color: string }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const radius = 10;
    for (let i = 0; i < count; i++) {
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);
      const distance = 3.0 + Math.random() * radius;
      pos[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
      pos[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
      pos[i * 3 + 2] = distance * Math.cos(theta);
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.04;
      pointsRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Scene3D Main Export ────────────────────────────────────────────────────────

export function Scene3D({
  config,
  onSelectCylinder,
}: {
  config: SceneConfig;
  onSelectCylinder: (id: number) => void;
}) {
  const activePalette = PALETTES[config.paletteKey] || PALETTES.cyber;

  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [4.5, 3.2, 5.0], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#050811"]} />

        {/* Studio Lighting Rig */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 12, 10]} intensity={1.8} color="#f8fafc" />
        <directionalLight position={[-8, -6, -5]} intensity={0.8} color={activePalette.primary} />
        <pointLight position={[0, 3, 2]} intensity={1.2} color={activePalette.secondary} />

        {/* 4-Cylinder Aero Engine Digital Twin */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <AeroPistonEngine config={config} onSelectCylinder={onSelectCylinder} />
        </Float>

        {/* Particle Cloud */}
        <ParticleSwarm count={config.particleDensity} color={activePalette.secondary} />

        {/* Cosmos Backdrop */}
        <Stars radius={120} depth={60} count={3500} factor={3} saturation={0} fade speed={0.8} />

        {/* Orbit Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={config.autoRotate}
          autoRotateSpeed={config.rotationSpeed}
          maxDistance={18}
          minDistance={2.5}
        />
      </Canvas>
    </div>
  );
}
