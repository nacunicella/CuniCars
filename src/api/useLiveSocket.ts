import { useCallback, useEffect, useRef, useState } from "react";
import { socketUrl } from "./client";
import { getDevices, getEventsFor, getPositions } from "./traccar";
import { isNative } from "../lib/platform";
import type { Device, Position, SocketMessage, TraccarEvent } from "../types/traccar";

interface LiveState {
  devices: Record<number, Device>;
  positions: Record<number, Position>; // por deviceId (última conocida)
  events: TraccarEvent[]; // rolling, más recientes primero
  connected: boolean;
}

export interface LiveSocket extends LiveState {
  reconnect: () => void; // reabre el WebSocket / fuerza un refresco (botón Actualizar)
}

const MAX_EVENTS = 50;
const EMPTY: LiveState = { devices: {}, positions: {}, events: [], connected: false };

// Estado vivo de dispositivos, últimas posiciones y eventos. Requiere sesión.
//
// En la web llega por el WebSocket /api/socket. Dentro del APK no se puede: la
// app corre en https://localhost y la cookie de sesión de Traccar es
// SameSite=Lax, así que no viaja en un handshake cross-site (y un token en la
// URL no reemplaza a la cookie). Ahí refrescamos por REST vía CapacitorHttp.
export function useLiveSocket(enabled: boolean): LiveSocket {
  const socket = useSocketFeed(enabled && !isNative);
  const polling = usePollingFeed(enabled && isNative);
  return isNative ? polling : socket;
}

// --- Web: WebSocket ---

function useSocketFeed(enabled: boolean): LiveSocket {
  const [state, setState] = useState<LiveState>(EMPTY);
  const [tick, setTick] = useState(0); // bump → re-corre el efecto = reconecta
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY);
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

// --- APK: polling REST ---

const POLL_MS = 15_000; // devices + positions
const EVENTS_EVERY = 4; // eventos: una vuelta de cada cuatro (~1 min)
const EVENTS_WINDOW_MS = 24 * 60 * 60 * 1000;

// Mezcla eventos nuevos con los que ya había, sin duplicar ids.
function mergeEvents(prev: TraccarEvent[], incoming: TraccarEvent[]): TraccarEvent[] {
  const byId = new Map<number, TraccarEvent>();
  for (const e of [...incoming, ...prev]) byId.set(e.id, e);
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime))
    .slice(0, MAX_EVENTS);
}

function usePollingFeed(enabled: boolean): LiveSocket {
  const [state, setState] = useState<LiveState>(EMPTY);
  const [tick, setTick] = useState(0); // bump → refresco inmediato

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY);
      return;
    }
    let stopped = false;
    let round = 0;

    const pollEvents = async (deviceIds: number[]) => {
      const to = new Date();
      const from = new Date(to.getTime() - EVENTS_WINDOW_MS);
      try {
        const evs = await getEventsFor(deviceIds, from.toISOString(), to.toISOString());
        if (!stopped) setState((s) => ({ ...s, events: mergeEvents(s.events, evs) }));
      } catch {
        /* los eventos son secundarios: que fallen no marca la app desconectada */
      }
    };

    const poll = async () => {
      if (stopped || document.hidden) return; // en segundo plano no gastamos datos
      const n = round++;
      try {
        const [ds, ps] = await Promise.all([getDevices(), getPositions()]);
        if (stopped) return;
        setState((s) => ({
          ...s,
          devices: Object.fromEntries(ds.map((d) => [d.id, d])),
          positions: Object.fromEntries(ps.map((p) => [p.deviceId, p])),
          connected: true,
        }));
        if (n % EVENTS_EVERY === 0) await pollEvents(ds.map((d) => d.id));
      } catch {
        if (!stopped) setState((s) => ({ ...s, connected: false }));
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    // Al volver del segundo plano el dato mostrado está viejo: refrescar ya.
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, tick]);

  const reconnect = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, reconnect };
}
