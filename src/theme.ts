// Tokens de diseño extraídos de CUNICARS.dc.html

export const colors = {
  bg: "#0d0d0f",
  surface: "#15171d",
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.08)",
  accent: "#4f8ef7",
  accentDark: "#1d4ed8",
  text: "#ffffff",
  textDim: "rgba(255,255,255,0.5)",
  textFaint: "rgba(255,255,255,0.3)",
  badge: "#ff4757",
} as const;

export type StatusKey = "connected" | "unstable" | "disconnected";

export const statusMap: Record<
  StatusKey,
  { label: string; color: string; bg: string; border: string }
> = {
  connected: {
    label: "Conectado",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
  },
  unstable: {
    label: "Inestable",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
  },
  disconnected: {
    label: "Desconectado",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
};

export type Severity = "high" | "medium" | "low";

export const sevMap: Record<Severity, { color: string; bg: string; border: string }> = {
  high: { color: "#ef4444", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.25)" },
  medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.22)" },
  low: { color: "#4f8ef7", bg: "rgba(79,142,247,0.14)", border: "rgba(79,142,247,0.22)" },
};

export type TileKey = "osm" | "carto" | "google" | "sat";

export interface TileDef {
  url: string;
  opts: { maxZoom: number; subdomains?: string; attribution: string };
}

export const tileDefs: Record<TileKey, TileDef> = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    opts: { maxZoom: 19, attribution: "© OpenStreetMap" },
  },
  carto: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    opts: { maxZoom: 20, subdomains: "abcd", attribution: "© OpenStreetMap · © CARTO" },
  },
  google: {
    // Tiles directos de Google (lyrs=m = mapa de calles). Sin API key.
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    opts: { maxZoom: 20, subdomains: "0123", attribution: "© Google" },
  },
  sat: {
    // Google híbrido (lyrs=y = satélite + etiquetas de calles). Sin API key.
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    opts: { maxZoom: 20, subdomains: "0123", attribution: "© Google" },
  },
};

export const mapMeta: {
  key: TileKey;
  name: string;
  desc: string;
  swatch: string;
  swatchBorder: string;
}[] = [
  { key: "osm", name: "OpenStreetMap", desc: "Gratis · Estándar", swatch: "linear-gradient(135deg,#8db87a,#6b9e8a)", swatchBorder: "none" },
  { key: "carto", name: "CartoDB Dark", desc: "Oscuro", swatch: "linear-gradient(135deg,#1a1c23,#252830)", swatchBorder: "none" },
  { key: "google", name: "Google Maps", desc: "Calles · Detallado", swatch: "linear-gradient(135deg,#d4e8f4,#c8dff0)", swatchBorder: "none" },
  { key: "sat", name: "Google Satélite", desc: "Aérea + calles · Recomendado", swatch: "linear-gradient(135deg,#2d4a1e,#4a6b3a)", swatchBorder: "1px solid rgba(79,142,247,0.3)" },
];

export const fontUI = "'Space Grotesk', sans-serif";
export const fontMono = "'Space Mono', monospace";
