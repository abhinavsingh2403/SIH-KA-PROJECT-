import { useState, useEffect, useRef, useCallback } from "react";
import { type LiveTelemetryPacket, type FederatedSummary, type SensorChannel } from "../types/telemetry";

const DEFAULT_WS_URL = "ws://localhost:8000/api/ws/telemetry/demo";

export function useTelemetrySocket(url: string = DEFAULT_WS_URL) {
  const [packet, setPacket] = useState<LiveTelemetryPacket | null>(null);
  const [federatedSummary, setFederatedSummary] = useState<FederatedSummary | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "telemetry") {
            setPacket(msg as LiveTelemetryPacket);
          } else if (msg.type === "federated_summary") {
            setFederatedSummary(msg.data as FederatedSummary);
          }
        } catch {
          // ignore json parse errors
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch {
      setIsConnected(false);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Fallback local simulation if backend WebSocket is offline
  useEffect(() => {
    if (isConnected) return;

    let simTime = 120;
    const interval = window.setInterval(() => {
      simTime += 1;
      const t = simTime;
      const rpm = 2400 + Math.sin(t * 0.1) * 60;

      const mockChannels: Record<SensorChannel, number> = {
        volt1: 28.3 + Math.sin(t * 0.05) * 0.2,
        volt2: 28.1 + Math.cos(t * 0.05) * 0.2,
        amp1: 34.0 + Math.sin(t * 0.08) * 2.0,
        amp2: 33.5 + Math.cos(t * 0.08) * 2.0,
        E1_FFlow: 11.2 + Math.sin(t * 0.02) * 0.5,
        E1_OilT: 86.5 + Math.sin(t * 0.01) * 2.0,
        E1_OilP: 64.0 - Math.sin(t * 0.01) * 1.5,
        E1_CHT1: 162.0 + Math.sin(t * 0.05) * 3.0,
        E1_CHT2: 156.0 + Math.cos(t * 0.05) * 3.0,
        E1_CHT3: 165.0 + Math.sin(t * 0.04) * 3.0,
        E1_CHT4: 154.0 + Math.cos(t * 0.04) * 3.0,
        E1_EGT1: 640.0 + Math.sin(t * 0.1) * 10.0,
        E1_EGT2: 635.0 + Math.cos(t * 0.1) * 10.0,
        E1_EGT3: 645.0 + Math.sin(t * 0.1) * 10.0,
        E1_EGT4: 630.0 + Math.cos(t * 0.1) * 10.0,
      };

      setPacket({
        type: "telemetry",
        flight_id: "flight_local_sim",
        profile: "patrol",
        t: t % 600,
        duration_seconds: 600,
        progress_pct: round((t % 600) / 6, 1),
        rpm: Math.round(rpm),
        channels: mockChannels,
        alerts: [],
        mission_risk: {
          flight_id: "flight_local_sim",
          health_score: 95.0,
          recommendation: "NOMINAL: Engine health within acceptable flight tolerances.",
        },
        stage1_anomaly: false,
        stage2_fault: "normal",
        is_paused: false,
        speed: 1.0,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isConnected]);

  const sendCommand = (cmd: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  };

  const setSpeed = (speed: number) => sendCommand({ action: "set_speed", speed });
  const pause = () => sendCommand({ action: "pause" });
  const resume = () => sendCommand({ action: "resume" });
  const seek = (t: number) => sendCommand({ action: "seek", t });
  const setProfile = (profile: string) => sendCommand({ action: "set_profile", profile });
  const triggerFederated = () => sendCommand({ action: "trigger_federated" });
  const injectFault = (fault_type: string, target_cylinder: number = 2, severity: number = 0.8) => {
    sendCommand({ action: "inject_fault", fault_type, target_cylinder, severity });
  };

  return {
    packet,
    federatedSummary,
    isConnected,
    setSpeed,
    pause,
    resume,
    seek,
    setProfile,
    triggerFederated,
    injectFault,
  };
}

function round(val: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(val * p) / p;
}
