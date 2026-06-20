import type { Device, Position, TraccarEvent } from "../types/traccar";
import type { Severity, StatusKey } from "../theme";
import { dateTime, knotsToKmh, relativeTime } from "./format";

// Modelo de vista de un vehículo (forma que consume el diseño).
export interface Vehicle {
  id: number; // deviceId
  name: string;
  plate: string;
  imei: string; // device.uniqueId
  contact: string; // device.contact (o phone) — vacío si no hay
  icon: string; // 'truck' | 'car'
  status: StatusKey;
  lastSeen: string;
  gpsRelative: string; // última señal GPS (fixTime) en relativo: "hace 5 min"
  gpsAbsolute: string; // última señal GPS en absoluto: "19/06 14:32"
  speed: number; // km/h
  location: string;
  lat: number;
  lng: number;
  hasPosition: boolean;
}

const TRUCK_CATEGORIES = new Set(["truck", "van", "tractor", "bus", "pickup"]);

function iconFor(device: Device): string {
  const cat = (device.category ?? "").toLowerCase();
  if (TRUCK_CATEGORIES.has(cat)) return "truck";
  return "car";
}

// Traccar status: 'online' | 'offline' | 'unknown' -> estados del diseño.
function statusFor(device: Device): StatusKey {
  if (device.status === "online") return "connected";
  if (device.status === "offline") return "disconnected";
  return "unstable";
}

function plateFor(device: Device): string {
  const attrPlate = device.attributes?.plate;
  if (typeof attrPlate === "string" && attrPlate) return attrPlate;
  return device.uniqueId;
}

function contactFor(device: Device): string {
  return (device.contact ?? device.phone ?? "").trim();
}

export function toVehicle(device: Device, pos: Position | undefined): Vehicle {
  const lat = pos?.latitude ?? -34.62;
  const lng = pos?.longitude ?? -58.41;
  return {
    id: device.id,
    name: device.name,
    plate: plateFor(device),
    imei: device.uniqueId,
    contact: contactFor(device),
    icon: iconFor(device),
    status: statusFor(device),
    lastSeen: relativeTime(device.lastUpdate),
    gpsRelative: relativeTime(pos?.fixTime ?? null),
    gpsAbsolute: dateTime(pos?.fixTime ?? null),
    speed: pos ? knotsToKmh(pos.speed) : 0,
    location: pos?.address ?? (pos ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Sin posición"),
    lat,
    lng,
    hasPosition: !!pos,
  };
}

export function buildVehicles(
  devices: Record<number, Device>,
  positions: Record<number, Position>,
): Vehicle[] {
  return Object.values(devices)
    .map((d) => toVehicle(d, positions[d.id]))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Eventos -> alertas ──

interface EventMeta {
  title: string;
  icon: string;
  sev: Severity;
}

// Mapea tipos de evento de Traccar a la presentación del diseño.
const EVENT_META: Record<string, EventMeta> = {
  deviceOverspeed: { title: "Exceso de velocidad", icon: "gauge", sev: "high" },
  geofenceExit: { title: "Salió de zona segura", icon: "shield-alert", sev: "medium" },
  geofenceEnter: { title: "Entró a zona", icon: "shield-alert", sev: "low" },
  alarm: { title: "Alarma", icon: "octagon-alert", sev: "high" },
  sos: { title: "Botón de pánico", icon: "octagon-alert", sev: "high" },
  ignitionOn: { title: "Encendido detectado", icon: "power", sev: "low" },
  ignitionOff: { title: "Motor apagado", icon: "power", sev: "low" },
  deviceMoving: { title: "Vehículo en movimiento", icon: "navigation", sev: "low" },
  deviceStopped: { title: "Vehículo detenido", icon: "octagon-alert", sev: "low" },
  deviceOnline: { title: "Dispositivo conectado", icon: "radio", sev: "low" },
  deviceOffline: { title: "Dispositivo desconectado", icon: "radio", sev: "medium" },
};

export interface Alert {
  id: number;
  title: string;
  detail: string;
  time: string;
  icon: string;
  sev: Severity;
  vehicle: string;
  vehicleContact: string; // contacto del device — vacío si no hay
  vehicleIcon: string;
}

export function toAlert(ev: TraccarEvent, devices: Record<number, Device>): Alert {
  const meta = EVENT_META[ev.type] ?? {
    title: ev.type,
    icon: "octagon-alert",
    sev: "medium" as Severity,
  };
  const device = devices[ev.deviceId];
  const alarm = ev.attributes?.alarm;
  return {
    id: ev.id || ev.eventTime ? new Date(ev.eventTime).getTime() + ev.deviceId : Math.random(),
    title: meta.title,
    detail: typeof alarm === "string" ? alarm : meta.title,
    time: relativeTime(ev.eventTime),
    icon: meta.icon,
    sev: meta.sev,
    vehicle: device?.name ?? `#${ev.deviceId}`,
    vehicleContact: device ? contactFor(device) : "",
    vehicleIcon: device ? iconFor(device) : "car",
  };
}
