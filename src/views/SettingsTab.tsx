import { useEffect, useState } from "react";
import Icon from "../ui/Icon";
import { mapMeta, type TileKey } from "../theme";
import type { TraccarUser } from "../types/traccar";
import { canInstallPWA, isStandalone, onInstallChange, promptInstall } from "../lib/pwa";

interface Props {
  user: TraccarUser | null;
  serverUrl: string;
  connecting: boolean;
  error: string | null;
  tileKey: TileKey;
  onConnect: (url: string, email: string, password: string) => void;
  onLogout: () => void;
  onTileChange: (key: TileKey) => void;
}

export default function SettingsTab({
  user,
  serverUrl,
  connecting,
  error,
  tileKey,
  onConnect,
  onLogout,
  onTileChange,
}: Props) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [standalone, setStandalone] = useState(false);
  const [, setCanInstall] = useState(false);
  const [pwaTip, setPwaTip] = useState("");

  useEffect(() => {
    setStandalone(isStandalone());
    setCanInstall(canInstallPWA());
    return onInstallChange(() => setCanInstall(canInstallPWA()));
  }, []);

  async function handleInstallPwa() {
    const r = await promptInstall();
    if (r === "unavailable") {
      setPwaTip(
        "Tu navegador no ofrece el instalador acá. En Chrome (Android): menú ⋮ → “Instalar app”. En iPhone (Safari): Compartir → “Agregar a inicio”.",
      );
    } else {
      setPwaTip("");
    }
  }

  async function handleDownloadApk() {
    // El archivo /cunicars.apk puede no existir aún (hay que compilarlo y subirlo).
    // Si no está, el server devuelve el index.html del SPA: lo detectamos y avisamos
    // en vez de descargar un .html basura.
    try {
      const res = await fetch("/cunicars.apk", { cache: "no-store" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || type.includes("text/html")) {
        setPwaTip("El APK todavía no está disponible. Hay que compilarlo y subir public/cunicars.apk.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CUNICARS.apk";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPwaTip("");
    } catch {
      setPwaTip("No se pudo descargar el APK.");
    }
  }

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "20px 16px 110px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Conexión Traccar */}
        <div>
          <p style={section}>Conexión Traccar</p>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
            <Field label="USUARIO" border>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" style={input} />
            </Field>
            <Field label="CONTRASEÑA">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={input} />
            </Field>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8, paddingLeft: 4 }}>{error}</p>}
          {user && (
            <p style={{ color: "#22c55e", fontSize: 12, marginTop: 8, paddingLeft: 4 }}>
              Conectado como {user.name}
            </p>
          )}
        </div>

        {user ? (
          <button onClick={onLogout} style={{ ...connectBtn, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
            <Icon name="plug" size={16} color="#ef4444" />
            Desconectar
          </button>
        ) : (
          <button onClick={() => onConnect(serverUrl, email, password)} disabled={connecting} style={{ ...connectBtn, opacity: connecting ? 0.6 : 1 }}>
            <Icon name="plug" size={16} color="#0d0d0f" />
            {connecting ? "Conectando…" : "Conectar"}
          </button>
        )}

        {/* Estilo de mapa */}
        <div>
          <p style={section}>Estilo de mapa</p>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
            {mapMeta.map((m, i) => {
              const selected = tileKey === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => onTileChange(m.key)}
                  style={{ width: "100%", border: "none", cursor: "pointer", background: "transparent", padding: "11px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < mapMeta.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", outline: "none" }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: m.swatch, border: m.swatchBorder, flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{m.desc}</div>
                  </div>
                  {selected && <Icon name="check-circle" size={18} color="#4f8ef7" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Instalación */}
        <div>
          <p style={section}>Instalación</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {standalone ? (
              <div style={{ ...installBtn, color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", cursor: "default" }}>
                <Icon name="check-circle" size={16} color="#22c55e" />
                App instalada
              </div>
            ) : (
              <button onClick={handleInstallPwa} style={installBtn}>
                <Icon name="download" size={16} color="#4f8ef7" />
                Instalar como app (PWA)
              </button>
            )}
            <button onClick={handleDownloadApk} style={installBtn}>
              <Icon name="download" size={16} color="#4f8ef7" />
              Descargar APK (Android)
            </button>
            {pwaTip && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, paddingLeft: 4 }}>{pwaTip}</p>}
          </div>
        </div>

        {/* App */}
        <div>
          <p style={section}>App</p>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ ...infoRow, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={infoKey}>Versión</span>
              <span style={infoVal}>1.0.0</span>
            </div>
            <div style={infoRow}>
              <span style={infoKey}>CUNICARS</span>
              <span style={infoVal}>by Nazareno</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, border, children }: { label: string; border?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: border ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
      <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

const section: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 };
const input: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none" };
const connectBtn: React.CSSProperties = { width: "100%", padding: 14, background: "#4f8ef7", border: "none", borderRadius: 14, color: "#0d0d0f", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", letterSpacing: "0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, outline: "none" };
const installBtn: React.CSSProperties = { width: "100%", padding: "13px 14px", background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 14, color: "#4f8ef7", fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, outline: "none", boxSizing: "border-box" };
const infoRow: React.CSSProperties = { padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" };
const infoKey: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 };
const infoVal: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.3)" };
