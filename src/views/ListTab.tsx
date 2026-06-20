import { useState } from "react";
import Icon from "../ui/Icon";
import { statusMap, type StatusKey } from "../theme";
import type { Vehicle } from "../lib/vehicles";

interface Props {
  vehicles: Vehicle[];
  onShowOnMap: (id: number) => void;
}

const filterDefs: { key: "all" | StatusKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "connected", label: "Conectados" },
  { key: "unstable", label: "Inestables" },
  { key: "disconnected", label: "Desconectados" },
];

export default function ListTab({ vehicles, onShowOnMap }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StatusKey>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const counts = {
    all: vehicles.length,
    connected: vehicles.filter((v) => v.status === "connected").length,
    unstable: vehicles.filter((v) => v.status === "unstable").length,
    disconnected: vehicles.filter((v) => v.status === "disconnected").length,
  };

  const q = query.trim().toLowerCase();
  const filtered = vehicles.filter((v) => {
    if (filter !== "all" && v.status !== filter) return false;
    if (
      q &&
      !v.name.toLowerCase().includes(q) &&
      !v.plate.toLowerCase().includes(q) &&
      !v.imei.toLowerCase().includes(q) &&
      !v.contact.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "14px 14px 110px" }}>
      {/* Búsqueda */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, padding: "10px 13px", marginBottom: 12 }}>
        <Icon name="search" size={16} color="rgba(255,255,255,0.35)" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, contacto o IMEI"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 13 }}
        />
      </div>

      {/* Chips de filtro */}
      <div style={{ display: "flex", gap: 7, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {filterDefs.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 13px",
                borderRadius: 11,
                border: `1px solid ${active ? "rgba(79,142,247,0.3)" : "rgba(255,255,255,0.08)"}`,
                background: active ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.04)",
                color: active ? "#4f8ef7" : "rgba(255,255,255,0.55)",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Space Grotesk',sans-serif",
                cursor: "pointer",
                outline: "none",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{counts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((v) => {
          const st = statusMap[v.status];
          const open = expanded === v.id;
          return (
            <div key={v.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(open ? null : v.id)}
                style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", outline: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: st.bg, border: `1px solid ${st.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={v.icon} size={19} color={st.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{v.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>{v.contact || v.plate}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>· {v.lastSeen}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <Icon name="satellite" size={11} color="rgba(255,255,255,0.3)" />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Última señal GPS: {v.gpsRelative}</span>
                  </div>
                </div>
                <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.3)" />
              </button>
              {open && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 14px 14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    <InfoRow icon="hash" label="IMEI" value={v.imei} />
                    <InfoRow icon="phone" label="Contacto" value={v.contact || "—"} />
                    <InfoRow icon="satellite" label="Señal GPS" value={v.gpsAbsolute} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => onShowOnMap(v.id)} style={actionBtn(true)}>
                      <Icon name="map-pin" size={14} color="#4f8ef7" />
                      Ver en mapa
                    </button>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${v.lat},${v.lng}`, "_blank")}
                      style={actionBtn(false)}
                    >
                      <Icon name="navigation" size={14} color="rgba(255,255,255,0.7)" />
                      Google Maps
                    </button>
                    <button style={actionBtn(false)}>
                      <Icon name="radio" size={14} color="rgba(255,255,255,0.7)" />
                      Pedir GPS
                    </button>
                    <button style={actionBtn(false)}>
                      <Icon name="sliders-horizontal" size={14} color="rgba(255,255,255,0.7)" />
                      Configurar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 20px", color: "rgba(255,255,255,0.25)" }}>
            <Icon name="search-x" size={34} color="rgba(255,255,255,0.25)" />
            <span style={{ fontSize: 13 }}>Ningún vehículo coincide</span>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name={icon} size={13} color="rgba(255,255,255,0.35)" />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontFamily: "'Space Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function actionBtn(primary: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "11px 8px",
    background: primary ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${primary ? "rgba(79,142,247,0.25)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 12,
    color: primary ? "#4f8ef7" : "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Space Grotesk',sans-serif",
    cursor: "pointer",
    outline: "none",
  };
}
