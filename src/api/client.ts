import axios from "axios";

// URL del servidor Traccar configurable desde Ajustes (persistida en localStorage),
// con fallback a la variable de entorno.
export const SERVER_KEY = "cunicars_server";

export function getServerUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_KEY);
    if (saved) return saved.replace(/\/$/, "");
  } catch {
    /* localStorage no disponible */
  }
  return (import.meta.env.VITE_TRACCAR_URL ?? "").replace(/\/$/, "");
}

export function setServerUrl(url: string): void {
  try {
    localStorage.setItem(SERVER_KEY, url.replace(/\/$/, ""));
  } catch {
    /* ignore */
  }
}

// Credenciales para re-login automático: la cookie de sesión de Traccar es de
// sesión (se borra al cerrar la app), así que guardamos email/pass para volver
// a autenticar al arrancar. Es para uso personal: queda en localStorage (no cifrado).
const AUTH_KEY = "cunicars_auth";

export interface SavedCreds {
  email: string;
  password: string;
}

export function saveCreds(email: string, password: string): void {
  try {
    localStorage.setItem(AUTH_KEY, btoa(unescape(encodeURIComponent(JSON.stringify({ email, password })))));
  } catch {
    /* ignore */
  }
}

export function loadCreds(): SavedCreds | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const obj = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (obj && typeof obj.email === "string" && typeof obj.password === "string") return obj;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearCreds(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

// Base del API. En dev usamos el proxy de Vite ("/api" -> Traccar) para evitar CORS.
// En build (Android/prod) pega directo al servidor configurado.
export function baseURL(): string {
  return import.meta.env.DEV ? "/api" : `${getServerUrl()}/api`;
}

export const api = axios.create({
  baseURL: baseURL(),
  withCredentials: true, // cookie de sesión JSESSIONID
  headers: { "Content-Type": "application/json" },
});

// Reaplica la base si el usuario cambió la URL en Ajustes (solo afecta prod).
export function refreshBaseUrl(): void {
  api.defaults.baseURL = baseURL();
}

// Origin del WebSocket en vivo (/api/socket).
export function socketUrl(): string {
  if (import.meta.env.DEV) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/api/socket`;
  }
  const base = getServerUrl().replace(/^http/, "ws");
  return `${base}/api/socket`;
}
