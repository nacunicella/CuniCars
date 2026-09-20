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

// Token de sesión para volver a autenticar al reabrir la app: la cookie de
// Traccar es de sesión y se pierde al cerrarla. Guardamos un token emitido por
// el servidor, no la contraseña: el token se revoca desde Traccar y no sirve
// para entrar a la cuenta.
const TOKEN_KEY = "cunicars_token";
const LEGACY_CREDS_KEY = "cunicars_auth"; // versiones viejas guardaban la clave

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// Borra la contraseña que dejaron guardada las versiones anteriores.
export function purgeLegacyCreds(): void {
  try {
    localStorage.removeItem(LEGACY_CREDS_KEY);
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

// La cookie de Traccar vence. Sin esto, cada pedido posterior devuelve 401 en
// bucle —el polling del APK repite el fallo cada 15 s— y la app se queda
// mostrando datos viejos sin avisar. Ante el primer 401 renovamos la sesión con
// el token guardado y reintentamos el pedido una sola vez.
let renovacion: Promise<boolean> | null = null;

async function renovarSesion(token: string): Promise<boolean> {
  try {
    await axios.get(`${baseURL()}/session`, {
      params: { token },
      withCredentials: true,
    });
    return true;
  } catch {
    clearToken(); // token revocado o vencido: no insistir
    return false;
  }
}

api.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as (typeof error.config & { _reintento?: boolean }) | undefined;
  if (error?.response?.status !== 401 || !config || config._reintento) throw error;

  const token = loadToken();
  if (!token) throw error;

  config._reintento = true;
  renovacion ??= renovarSesion(token).finally(() => {
    renovacion = null;
  });
  if (!(await renovacion)) throw error;
  return api.request(config);
});

// Origin del WebSocket en vivo (/api/socket).
export function socketUrl(): string {
  if (import.meta.env.DEV) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/api/socket`;
  }
  const base = getServerUrl().replace(/^http/, "ws");
  return `${base}/api/socket`;
}
