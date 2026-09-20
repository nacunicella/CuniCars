import { CapacitorHttp } from "@capacitor/core";
import { getServerUrl } from "../api/client";
import { isNative } from "./platform";

// Pega al servidor con el HTTP nativo de Android, sin axios ni el parche de
// XMLHttpRequest de por medio. Sirve para saber, cuando falla el login, si el
// problema es el transporte (red, TLS, certificado) o la capa de axios.
export async function nativeProbe(): Promise<string> {
  if (!isNative) return "";
  const url = `${getServerUrl()}/api/server`;
  try {
    const res = await CapacitorHttp.request({ method: "GET", url });
    return `nativo: HTTP ${res.status}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `nativo: falló (${msg})`;
  }
}

// Texto corto y concreto a partir de lo que tiró axios.
export function describeError(e: unknown): string {
  const err = e as {
    message?: string;
    code?: string;
    response?: { status?: number };
  };
  if (err?.response?.status) return `HTTP ${err.response.status}`;
  if (err?.code) return `${err.code}${err.message ? ` — ${err.message}` : ""}`;
  return err?.message ?? "error desconocido";
}
