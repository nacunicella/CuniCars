import { useCallback, useEffect, useRef, useState } from "react";
import { socketUrl } from "./client";
import type { Device, Position, SocketMessage, TraccarEvent } from "../types/traccar";

interface LiveState {
  devices: Record<number, Device>;
  positions: Record<number, Position>; // por deviceId (última conocida)
  events: TraccarEvent[]; // rolling, más recientes primero
  connected: boolean;
}

export interface LiveSocket extends LiveState {
  reconnect: () => void; // cierra y reabre el WebSocket (botón Actualizar)
}

const MAX_EVENTS = 50;

// Suscribe al WebSocket /api/socket de Traccar y mantiene estado vivo de
// dispositivos, últimas posiciones y eventos. Requiere sesión activa (cookie).
export function useLiveSocket(enabled: boolean): LiveSocket {
  const [state, setState] = useState<LiveState>({
    devices: {},
    positions: {},
    events: [],
    connected: false,
  });
  const [tick, setTick] = useState(0); // bump → re-corre el efecto = reconecta
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ devices: {}, positions: {}, events: [], connected: false });
      return;
    }
    let closed = false;

    const connect = () => {
      const ws = new WebSocket(socketUrl());
      wsRef.current = ws;

      ws.onopen = () => setState((s) => ({ ...s, connected: true }));

      ws.onmessage = (ev) => {
        const msg: SocketMessage = JSON.parse(ev.data);
        setState((s) => {
          const devices = { ...s.devices };
          const positions = { ...s.positions };
          msg.devices?.forEach((d) => (devices[d.id] = d));
          msg.positions?.forEach((p) => (positions[p.deviceId] = p));
          const events = msg.events?.length
            ? [...msg.events, ...s.events].slice(0, MAX_EVENTS)
            : s.events;
          return { ...s, devices, positions, events };
        });
      };

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        if (!closed) retryRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      closed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [enabled, tick]);

  const reconnect = useCallback(() => {
    setState((s) => ({ ...s, connected: false }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reconnect };
}
