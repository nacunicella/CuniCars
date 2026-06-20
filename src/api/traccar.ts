import { api } from "./client";
import type {
  Device,
  Geofence,
  Position,
  TraccarEvent,
  TraccarUser,
} from "../types/traccar";

// --- Sesión / Auth ---

// Inicia sesión. Traccar espera form-urlencoded en /api/session.
export async function login(
  email: string,
  password: string,
): Promise<TraccarUser> {
  const body = new URLSearchParams({ email, password });
  const { data } = await api.post<TraccarUser>("/session", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

// Devuelve el usuario actual si hay sesión activa, o null (401).
export async function getSession(): Promise<TraccarUser | null> {
  try {
    const { data } = await api.get<TraccarUser>("/session");
    return data;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await api.delete("/session");
}

// --- Recursos ---

export async function getDevices(): Promise<Device[]> {
  const { data } = await api.get<Device[]>("/devices");
  return data;
}

// Últimas posiciones conocidas de todos los dispositivos accesibles.
export async function getPositions(): Promise<Position[]> {
  const { data } = await api.get<Position[]>("/positions");
  return data;
}

export async function getGeofences(): Promise<Geofence[]> {
  const { data } = await api.get<Geofence[]>("/geofences");
  return data;
}

// Historial de recorrido de un dispositivo entre dos fechas ISO.
export async function getRoute(
  deviceId: number,
  from: string,
  to: string,
): Promise<Position[]> {
  const { data } = await api.get<Position[]>("/positions", {
    params: { deviceId, from, to },
  });
  return data;
}

// Eventos (alarmas, geocercas, etc.) de un dispositivo en un rango.
export async function getEvents(
  deviceId: number,
  from: string,
  to: string,
): Promise<TraccarEvent[]> {
  const { data } = await api.get<TraccarEvent[]>("/reports/events", {
    params: { deviceId, from, to },
  });
  return data;
}
