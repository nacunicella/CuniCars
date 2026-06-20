import Icon from "../ui/Icon";
import { sevMap } from "../theme";
import type { Alert } from "../lib/vehicles";

export default function AlertsTab({ alerts }: { alerts: Alert[] }) {
  const label = `${alerts.length} ${alerts.length === 1 ? "alerta" : "alertas"}`;

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", padding: "14px 14px 110px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{label}</span>
        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", outline: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>
          <Icon name="check-check" size={14} color="rgba(255,255,255,0.4)" />
          Marcar leídas
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a) => {
          const sev = sevMap[a.sev];
          return (
            <div key={a.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: sev.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={a.icon} size={18} color={sev.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{a.title}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{a.time}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{a.detail}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <Icon name={a.vehicleIcon} size={12} color="rgba(255,255,255,0.3)" />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{a.vehicle}</span>
                  {a.vehicleContact && (
                    <>
                      <Icon name="phone" size={10} color="rgba(255,255,255,0.3)" />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono',monospace" }}>{a.vehicleContact}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 20px", color: "rgba(255,255,255,0.25)" }}>
            <Icon name="bell" size={34} color="rgba(255,255,255,0.25)" />
            <span style={{ fontSize: 13 }}>Sin alertas por ahora</span>
          </div>
        )}
      </div>
    </div>
  );
}
