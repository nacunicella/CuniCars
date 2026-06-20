// Tipos del API de Traccar (subconjunto usado por la app).
// Referencia: https://www.traccar.org/api-reference/

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  administrator: boolean;
  [key: string]: unknown;
}

export type DeviceStatus = "online" | "offline" | "unknown";

export interface Device {
  id: number;
  name: string;
  uniqueId: string;
  status: DeviceStatus;
  lastUpdate: string | null;
  positionId: number;
  groupId: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled: boolean;
  attributes: Record<string, unknown>;
}

export interface Position {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number; // nudos
  course: number;
  address: string | null;
  accuracy: number;
  attributes: Record<string, unknown>;
}

export interface Geofence {
  id: number;
  name: string;
  description: string;
  area: string; // WKT
  attributes: Record<string, unknown>;
}

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId: number;
  geofenceId: number;
  maintenanceId: number;
  attributes: Record<string, unknown>;
}

// Mensaje que empuja el WebSocket /api/socket
export interface SocketMessage {
  devices?: Device[];
  positions?: Position[];
  events?: TraccarEvent[];
}
