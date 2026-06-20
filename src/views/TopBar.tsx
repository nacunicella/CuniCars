import Icon from "../ui/Icon";

interface Props {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function TopBar({ refreshing, onRefresh }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", background: "#0d0d0f", borderBottom: "1px solid rgba(255,255,255,0.06)", zIndex: 10, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#4f8ef7 0%,#1d4ed8 100%)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="car" size={18} color="#0d0d0f" />
        </div>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, letterSpacing: "0.04em", color: "#fff", lineHeight: 1 }}>CUNICARS</span>
      </div>
      <button
        onClick={onRefresh}
        style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.25)", borderRadius: 10, padding: "9px 14px", cursor: "pointer", color: "#4f8ef7", fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", outline: "none" }}
      >
        <span style={{ display: "flex", animation: refreshing ? "spin 0.8s linear infinite" : undefined }}>
          <Icon name="refresh-cw" size={15} color="#4f8ef7" />
        </span>
        Actualizar
      </button>
    </div>
  );
}
