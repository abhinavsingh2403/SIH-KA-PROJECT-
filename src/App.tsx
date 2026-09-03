import { useState } from "react";
import { Scene3D, type SceneConfig } from "./components/Scene3D";
import { OverlayHUD } from "./components/OverlayHUD";
import { useTelemetrySocket } from "./lib/useTelemetrySocket";

export function App() {
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    wireframe: false,
    autoRotate: true,
    rotationSpeed: 1.0,
    particleDensity: 2000,
    paletteKey: "cyber",
    selectedCylinder: null,
    activeFault: null,
    rpm: 2450,
    explodedView: false,
  });

  // Connect to live FastAPI WebSocket telemetry stream
  const {
    packet,
    isConnected,
    setSpeed,
    pause,
    resume,
    injectFault,
  } = useTelemetrySocket();

  const handleConfigChange = (updated: Partial<SceneConfig>) => {
    setSceneConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleSelectCylinder = (id: number) => {
    setSceneConfig((prev) => ({
      ...prev,
      selectedCylinder: prev.selectedCylinder === id ? null : id,
    }));
  };

  const handleLiveInjectFault = (faultType: string, targetCylinder?: number, severity?: number) => {
    // 1. Update local visual state
    setSceneConfig((prev) => ({
      ...prev,
      activeFault: faultType,
      selectedCylinder: targetCylinder || prev.selectedCylinder,
    }));
    // 2. Send command to backend physics engine if connected
    injectFault(faultType, targetCylinder || 2, severity || 0.85);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050811]">
      {/* 3D WebGL Aero Piston Digital Twin with Exploded View */}
      <Scene3D
        config={sceneConfig}
        livePacket={packet}
        onSelectCylinder={handleSelectCylinder}
      />

      {/* Interactive Command Center HUD */}
      <OverlayHUD
        config={sceneConfig}
        livePacket={packet}
        isConnected={isConnected}
        onPause={pause}
        onResume={resume}
        onSetSpeed={setSpeed}
        onInjectFault={handleLiveInjectFault}
        onChange={handleConfigChange}
      />
    </main>
  );
}

export default App;
