import { useState } from "react";
import { type SceneConfig } from "./components/Scene3D";
import { Dashboard } from "./components/Dashboard";
import { useTelemetrySocket } from "./lib/useTelemetrySocket";

export function App() {
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    wireframe: false,
    autoRotate: false,
    rotationSpeed: 0.8,
    particleDensity: 2000,
    paletteKey: "isro", // Default ISRO mission control theme
    selectedCylinder: null,
    activeFault: null,
    rpm: 2450,
    explodedView: false,
  });

  // Connect to live FastAPI WebSocket telemetry stream with persistent state
  const {
    packet,
    federatedSummary,
    isConnected,
    selectedSpeed,
    selectedFault,
    selectedProfile,
    setSpeed,
    pause,
    resume,
    setProfile,
    triggerFederated,
    injectFault,
  } = useTelemetrySocket();

  const handleConfigChange = (updated: Partial<SceneConfig>) => {
    setSceneConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleLiveInjectFault = (faultType: string, targetCylinder?: number, severity?: number) => {
    setSceneConfig((prev) => ({
      ...prev,
      activeFault: faultType === "normal" ? null : faultType,
      selectedCylinder: faultType === "cylinder_head_overheat" ? (targetCylinder || 2) : null,
    }));
    injectFault(faultType, targetCylinder || 2, severity || 0.85);
  };

  return (
    <Dashboard
      config={sceneConfig}
      livePacket={packet}
      federatedSummary={federatedSummary}
      isConnected={isConnected}
      selectedSpeed={selectedSpeed}
      selectedFault={selectedFault}
      selectedProfile={selectedProfile}
      onPause={pause}
      onResume={resume}
      onSetSpeed={setSpeed}
      onSetProfile={setProfile}
      onTriggerFederated={triggerFederated}
      onInjectFault={handleLiveInjectFault}
      onChange={handleConfigChange}
    />
  );
}

export default App;
