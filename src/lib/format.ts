// Helpers de formato compartidos.

export const KNOTS_TO_KMH = 1.852;

export function knotsToKmh(knots: number): number {
  return Math.round(knots * KNOTS_TO_KMH);
}

// "hace 2 min" / "hace 1 h" / "hace 3 d" desde una fecha ISO.
export function relativeTime(iso: string | null): string {
  if (!iso) return "sin datos";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "ahora";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

// Distancia Haversine en km entre dos [lat,lng].
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Formatea km con coma decimal (es-AR): 12.4 -> "12,4 km".
export function kmLabel(km: number): string {
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function durationLabel(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Fecha + hora absoluta es-AR: "19/06 14:32".
export function dateTime(iso: string | null): string {
  if (!iso) return "sin señal";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
