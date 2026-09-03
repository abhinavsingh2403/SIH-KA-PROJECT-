import { useState } from "react";
import { Scene3D, type SceneConfig } from "./components/Scene3D";
import { OverlayHUD } from "./components/OverlayHUD";

export function App() {
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    wireframe: false,
    autoRotate: true,
    rotationSpeed: 1.2,
    particleDensity: 2000,
    paletteKey: "cyber",
    selectedCylinder: null,
    activeFault: null,
    rpm: 2450,
  });

  const handleConfigChange = (updated: Partial<SceneConfig>) => {
    setSceneConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleSelectCylinder = (id: number) => {
    setSceneConfig((prev) => ({
      ...prev,
      selectedCylinder: prev.selectedCylinder === id ? null : id,
    }));
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050811]">
      {/* 3D WebGL Aero Piston Digital Twin */}
      <Scene3D config={sceneConfig} onSelectCylinder={handleSelectCylinder} />

      {/* Interactive Command Center HUD */}
      <OverlayHUD config={sceneConfig} onChange={handleConfigChange} />
    </main>
  );
}

export default App;
