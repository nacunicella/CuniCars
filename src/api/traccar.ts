import { api, getServerUrl } from "./client";
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

// Eventos de varios dispositivos a la vez, para el refresco por REST del APK.
// Traccar espera el parámetro repetido (deviceId=1&deviceId=2); axios por
// defecto serializa arrays como deviceId[]=1, que el server ignora.
export async function getEventsFor(
  deviceIds: number[],
  from: string,
  to: string,
): Promise<TraccarEvent[]> {
  if (!deviceIds.length) return [];
  const { data } = await api.get<TraccarEvent[]>("/reports/events", {
    params: { deviceId: deviceIds, from, to, type: "allEvents" },
    paramsSerializer: { indexes: null },
    headers: { Accept: "application/json" }, // sin esto puede devolver xlsx
  });
  return data;
}

// Dirección de un punto. El geocoder de Traccar está en `onRequestOnly` para no
// hacerle abuso a Nominatim: por eso `position.address` viene siempre en null y
// hay que pedir la dirección a mano, solo del vehículo que el usuario mira.
export async function getAddress(latitude: number, longitude: number): Promise<string> {
  const { data } = await api.get<string>("/server/geocode", {
    params: { latitude, longitude },
    headers: { Accept: "text/plain" },
  });
  return typeof data === "string" ? data.trim() : "";
}

// ── Reportes del servidor ──
// Calcular distancia y tiempos sumando posiciones en el cliente arrastra el
// ruido del GPS (un vehículo detenido "viaja" metros). Estos reportes los
// calcula Traccar con sus propios filtros.

export interface RouteSummary {
  deviceId: number;
  distance: number; // metros
  averageSpeed: number; // nudos
  maxSpeed: number; // nudos
  engineHours?: number;
}

export async function getSummary(
  deviceId: number,
  from: string,
  to: string,
): Promise<RouteSummary | null> {
  const { data } = await api.get<RouteSummary[]>("/reports/summary", {
    params: { deviceId, from, to },
    headers: { Accept: "application/json" },
  });
  return data?.[0] ?? null;
}

export interface Stop {
  deviceId: number;
  startTime: string;
  endTime: string;
  duration: number; // ms
  address: string | null;
  latitude: number;
  longitude: number;
}

export async function getStops(deviceId: number, from: string, to: string): Promise<Stop[]> {
  const { data } = await api.get<Stop[]>("/reports/stops", {
    params: { deviceId, from, to },
    headers: { Accept: "application/json" },
  });
  return data ?? [];
}

export interface Trip {
  deviceId: number;
  startTime: string;
  endTime: string;
  duration: number; // ms
  distance: number; // metros
  maxSpeed: number; // nudos
}

export async function getTrips(deviceId: number, from: string, to: string): Promise<Trip[]> {
  const { data } = await api.get<Trip[]>("/reports/trips", {
    params: { deviceId, from, to },
    headers: { Accept: "application/json" },
  });
  return data ?? [];
}

// Enlace temporal para que alguien vea un vehículo sin tener cuenta.
// Traccar devuelve texto plano: a veces la URL completa, a veces solo el token.
export async function shareDevice(deviceId: number, horas: number): Promise<string> {
  const expiration = new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
  const { data } = await api.get<string>("/devices/share", {
    params: { deviceId, expiration },
    headers: { Accept: "text/plain" },
  });
  const raw = typeof data === "string" ? data.trim() : "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getServerUrl()}/?token=${encodeURIComponent(raw)}`;
}
