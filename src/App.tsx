import { useState } from "react";
import { type SceneConfig } from "./components/Scene3D";
import { Dashboard } from "./components/Dashboard";
import { useTelemetrySocket } from "./lib/useTelemetrySocket";

export function App() {
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    wireframe: false,
    autoRotate: true,
    rotationSpeed: 0.8,
    particleDensity: 2000,
    paletteKey: "isro", // Default ISRO mission control theme
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

  const handleLiveInjectFault = (faultType: string, targetCylinder?: number, severity?: number) => {
    setSceneConfig((prev) => ({
      ...prev,
      activeFault: faultType === "normal" ? null : faultType,
      selectedCylinder: targetCylinder || prev.selectedCylinder,
    }));
    injectFault(faultType, targetCylinder || 2, severity || 0.85);
  };

  return (
    <Dashboard
      config={sceneConfig}
      livePacket={packet}
      isConnected={isConnected}
      onPause={pause}
      onResume={resume}
      onSetSpeed={setSpeed}
      onInjectFault={handleLiveInjectFault}
      onChange={handleConfigChange}
    />
  );
}

export default App;
