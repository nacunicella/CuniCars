import Icon from "../ui/Icon";

export type TabKey = "map" | "list" | "alert" | "route" | "settings";

const tabMeta: { key: TabKey; icon: string; label: string }[] = [
  { key: "map", icon: "map-pin", label: "Mapa" },
  { key: "list", icon: "list", label: "Lista" },
  { key: "alert", icon: "bell", label: "Alertas" },
  { key: "route", icon: "route", label: "Recorrido" },
  { key: "settings", icon: "settings", label: "Ajustes" },
];

interface Props {
  active: TabKey;
  alertCount: number;
  onSelect: (key: TabKey) => void;
}

export default function BottomDock({ active, alertCount, onSelect }: Props) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 16px 28px", zIndex: 20, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "stretch", width: "100%", maxWidth: 360, background: "rgba(13,13,15,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 6, backdropFilter: "blur(20px)", gap: 2, pointerEvents: "auto" }}>
        {tabMeta.map((t) => {
          const on = active === t.key;
          const color = on ? "#4f8ef7" : "rgba(255,255,255,0.4)";
          const showBadge = t.key === "alert" && alertCount > 0;
          return (
            <button
              key={t.key}
              onClick={() => onSelect(t.key)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "10px 4px", borderRadius: 18, border: "none", cursor: "pointer", outline: "none", background: on ? "rgba(79,142,247,0.12)" : "transparent", transition: "background 0.2s" }}
            >
              <div style={{ position: "relative", width: 20, height: 20 }}>
                <span style={{ color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={t.icon} size={20} color={color} />
                </span>
                {showBadge && (
                  <div style={{ position: "absolute", top: -3, right: -4, minWidth: 14, height: 14, padding: "0 3px", background: "#ff4757", borderRadius: 7, border: "1.5px solid #0d0d0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{alertCount}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
