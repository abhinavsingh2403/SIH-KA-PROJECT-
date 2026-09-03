import { useState, useEffect, useRef, useCallback } from "react";
import { type LiveTelemetryPacket, type FederatedSummary, type SensorChannel } from "../types/telemetry";

// Dynamic WebSocket URL based on current browser hostname
function getWsUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8000/api/ws/telemetry/demo`;
  }
  return "ws://localhost:8000/api/ws/telemetry/demo";
}

export function useTelemetrySocket(url: string = getWsUrl()) {
  const [packet, setPacket] = useState<LiveTelemetryPacket | null>(null);
  const [federatedSummary, setFederatedSummary] = useState<FederatedSummary | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Persistent user control states that NEVER get accidentally overwritten
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [selectedFault, setSelectedFault] = useState<string>("normal");
  const [selectedProfile, setSelectedProfile] = useState<string>("patrol");
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Keep ref to latest fault/speed for non-stale callbacks
  const stateRef = useRef({
    speed: selectedSpeed,
    fault: selectedFault,
    profile: selectedProfile,
    paused: isPaused,
  });
  stateRef.current = {
    speed: selectedSpeed,
    fault: selectedFault,
    profile: selectedProfile,
    paused: isPaused,
  };

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    try {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMountedRef.current) {
          setIsConnected(true);
          // Sync active settings upon connection
          if (stateRef.current.speed !== 1.0) {
            ws.send(JSON.stringify({ action: "set_speed", speed: stateRef.current.speed }));
          }
          if (stateRef.current.fault !== "normal") {
            ws.send(JSON.stringify({
              action: "inject_fault",
              fault_type: stateRef.current.fault,
              target_cylinder: 2,
              severity: 0.85,
            }));
          }
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "telemetry") {
            const pkt = msg as LiveTelemetryPacket;
            // Ensure local state and incoming telemetry packet stay tightly synchronized
            setPacket({
              ...pkt,
              speed: stateRef.current.speed,
              stage2_fault: stateRef.current.fault !== "normal" ? stateRef.current.fault : pkt.stage2_fault,
            });
          } else if (msg.type === "federated_summary") {
            setFederatedSummary(msg.data as FederatedSummary);
          }
        } catch {
          // ignore json parse errors
        }
      };

      ws.onerror = () => {
        if (isMountedRef.current) {
          setIsConnected(false);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, 3000);
      };
    } catch {
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [url]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Robust fallback local simulation if backend WebSocket is offline or reconnecting
  useEffect(() => {
    if (isConnected) return;

    let simTime = 120;
    const tickInterval = 100;

    const interval = window.setInterval(() => {
      const { speed, fault, profile, paused } = stateRef.current;
      if (!paused) {
        simTime += (tickInterval / 1000) * speed;
      }

      const t = simTime;
      const rpmBase = profile === "climb" ? 2550 : profile === "cruise" ? 2380 : 2420;
      const rpm = rpmBase + Math.sin(t * 0.1) * 40;

      // Realistic baseline channel physics
      const mockChannels: Record<SensorChannel, number> = {
        volt1: 28.3 + Math.sin(t * 0.05) * 0.1,
        volt2: 28.1 + Math.cos(t * 0.05) * 0.1,
        amp1: 33.5 + Math.sin(t * 0.08) * 1.5,
        amp2: 32.8 + Math.cos(t * 0.08) * 1.5,
        E1_FFlow: 11.2 + Math.sin(t * 0.02) * 0.3,
        E1_OilT: 86.5 + Math.sin(t * 0.01) * 1.0,
        E1_OilP: 64.0 - Math.sin(t * 0.01) * 1.0,
        E1_CHT1: 162.0 + Math.sin(t * 0.03) * 1.5,
        E1_CHT2: 158.0 + Math.cos(t * 0.03) * 1.5,
        E1_CHT3: 164.0 + Math.sin(t * 0.03) * 1.5,
        E1_CHT4: 156.0 + Math.cos(t * 0.03) * 1.5,
        E1_EGT1: 640.0 + Math.sin(t * 0.05) * 4.0,
        E1_EGT2: 635.0 + Math.cos(t * 0.05) * 4.0,
        E1_EGT3: 645.0 + Math.sin(t * 0.05) * 4.0,
        E1_EGT4: 630.0 + Math.cos(t * 0.05) * 4.0,
      };

      let healthScore = 96.0;
      let isAnomalous = false;
      let recommendation = "NOMINAL: Engine health within acceptable flight tolerances.";

      // Apply FMEA fault physically and persistently
      if (fault === "oil_cooler_degradation") {
        mockChannels.E1_OilT = 118.5 + Math.sin(t * 0.02) * 2.0;
        mockChannels.E1_OilP = 36.2 - Math.sin(t * 0.02) * 1.5;
        healthScore = 58.0;
        isAnomalous = true;
        recommendation = "WARNING: Elevated oil temperature and pressure sag. Oil cooler heat exchanger degradation suspected.";
      } else if (fault === "cylinder_head_overheat") {
        mockChannels.E1_CHT2 = 236.0 + Math.sin(t * 0.05) * 3.0;
        mockChannels.E1_EGT2 = 712.0 + Math.sin(t * 0.05) * 8.0;
        healthScore = 52.0;
        isAnomalous = true;
        recommendation = "CRITICAL: Cylinder 2 thermal runaway detected. CHT exceeding 230°C certified margin. Reduce throttle.";
      } else if (fault === "alternator_rectifier_drift") {
        mockChannels.volt1 = 24.2 + Math.sin(t * 0.2) * 0.4;
        mockChannels.amp1 = 48.0 + Math.sin(t * 0.1) * 3.0;
        healthScore = 64.0;
        isAnomalous = true;
        recommendation = "CAUTION: Bus 1 voltage drop and current surge. Alternator rectifier diode degradation suspected.";
      } else if (fault === "fuel_flow_oscillation") {
        mockChannels.E1_FFlow = 11.5 + Math.sin(t * 0.4) * 3.8;
        mockChannels.E1_EGT1 += Math.sin(t * 0.4) * 15.0;
        mockChannels.E1_EGT2 += Math.sin(t * 0.4) * 15.0;
        healthScore = 68.0;
        isAnomalous = true;
        recommendation = "CAUTION: Fuel flow hunting and pressure oscillations. Fuel metering unit stick-slip suspected.";
      }

      setPacket({
        type: "telemetry",
        flight_id: "flight_local_sim",
        profile,
        t: Math.round(t % 600),
        duration_seconds: 600,
        progress_pct: Math.round(((t % 600) / 600) * 100),
        rpm: Math.round(rpm),
        channels: mockChannels,
        alerts: isAnomalous
          ? [
              {
                alert_id: "alert_sim_01",
                flight_id: "flight_local_sim",
                timestamp: Math.round(t % 600),
                fault_type: fault,
                confidence: 0.96,
                severity: { value: healthScore < 55 ? "critical" : "warning" },
                auto_action_eligible: healthScore < 55,
                key_sensors: fault === "oil_cooler_degradation" ? ["E1_OilT", "E1_OilP"] : ["E1_CHT2"],
                report_text: recommendation,
              } as unknown as LiveTelemetryPacket["alerts"][0],
            ]
          : [],
        mission_risk: {
          flight_id: "flight_local_sim",
          health_score: healthScore,
          recommendation,
        },
        stage1_anomaly: isAnomalous,
        stage2_fault: fault,
        is_paused: paused,
        speed,
      });
    }, tickInterval);

    return () => clearInterval(interval);
  }, [isConnected]);

  const sendCommand = (cmd: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  };

  const setSpeed = (speed: number) => {
    setSelectedSpeed(speed);
    sendCommand({ action: "set_speed", speed });
  };

  const pause = () => {
    setIsPaused(true);
    sendCommand({ action: "pause" });
  };

  const resume = () => {
    setIsPaused(false);
    sendCommand({ action: "resume" });
  };

  const seek = (t: number) => {
    sendCommand({ action: "seek", t });
  };

  const setProfile = (profile: string) => {
    setSelectedProfile(profile);
    sendCommand({ action: "set_profile", profile });
  };

  const triggerFederated = () => {
    sendCommand({ action: "trigger_federated" });
  };

  const injectFault = (fault_type: string, target_cylinder: number = 2, severity: number = 0.85) => {
    setSelectedFault(fault_type);
    sendCommand({ action: "inject_fault", fault_type, target_cylinder, severity });
  };

  return {
    packet,
    federatedSummary,
    isConnected,
    selectedSpeed,
    selectedFault,
    selectedProfile,
    isPaused,
    setSpeed,
    pause,
    resume,
    seek,
    setProfile,
    triggerFederated,
    injectFault,
  };
}
