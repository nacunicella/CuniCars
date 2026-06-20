import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet.markercluster";
import Icon from "../ui/Icon";
import { statusMap, tileDefs, type StatusKey, type TileKey } from "../theme";
import type { Vehicle } from "../lib/vehicles";

interface Props {
  vehicles: Vehicle[];
  tileKey: TileKey;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function markerHtml(icon: string, status: StatusKey): string {
  const st = statusMap[status];
  const ring =
    status === "connected"
      ? `<span class="cuni-ring" style="position:absolute;width:38px;height:38px;border-radius:50%;background:${st.color};"></span>`
      : "";
  // El ícono lucide se dibuja como SVG inline (no dependemos de window.lucide).
  return `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;">
    ${ring}
    <span style="position:relative;width:34px;height:34px;border-radius:50%;background:#15171d;border:2px solid ${st.color};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
      <span data-veh-icon="${icon}" style="color:${st.color};display:flex;"></span>
    </span></div>`;
}

export default function MapTab({ vehicles, tileKey, selectedId, onSelect }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileKeyRef = useRef<TileKey | null>(null);
  const didFitRef = useRef(false); // encuadre inicial: solo una vez, no en cada update del socket
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [picker, setPicker] = useState(false); // panel "Ir a vehículo"
  const [pickQuery, setPickQuery] = useState("");

  // Init map una sola vez.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 20, // requerido por markercluster (getMaxZoom finito)
    }).setView([-34.62, -58.41], 12);
    mapRef.current = map;

    const updateZoomClass = () => {
      const c = map.getContainer();
      if (map.getZoom() < 13) c.classList.add("cuni-map-far");
      else c.classList.remove("cuni-map-far");
    };
    map.on("zoomend", updateZoomClass);
    updateZoomClass();
    setTimeout(() => map.invalidateSize(), 80);

    return () => {
      map.remove();
      mapRef.current = null;
      // Resetea refs para que tiles/markers se re-agreguen al nuevo mapa
      // (StrictMode remonta y los guards por ref si no, lo saltean).
      tileKeyRef.current = null;
      clusterRef.current = null;
      didFitRef.current = false;
    };
  }, []);

  // Tiles según el estilo elegido.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || tileKeyRef.current === tileKey) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const def = tileDefs[tileKey] ?? tileDefs.carto;
    tileRef.current = L.tileLayer(def.url, def.opts).addTo(map);
    tileKeyRef.current = tileKey;
  }, [tileKey]);

  // Markers (se reconstruyen cuando cambian posiciones/estado).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      disableClusteringAtZoom: 16, // zoom 16+ : cada vehículo individual, sin agrupar
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const html = `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;">
          <span style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(79,142,247,0.35);"></span>
          <span style="position:relative;width:38px;height:38px;border-radius:50%;background:#4f8ef7;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;font-family:'Space Grotesk',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.5);">${count}</span>
        </div>`;
        return L.divIcon({ html, className: "cuni-cluster", iconSize: [42, 42], iconAnchor: [21, 21] });
      },
    });
    clusterRef.current = cluster;

    vehicles
      .filter((v) => v.hasPosition)
      .forEach((v) => {
        const icon = L.divIcon({
          html: markerHtml(v.icon, v.status),
          className: "cuni-marker",
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        const marker = L.marker([v.lat, v.lng], { icon });
        // Etiqueta permanente con el nombre, debajo del marcador.
        marker.bindTooltip(v.name, {
          permanent: true,
          direction: "bottom",
          className: "cuni-label",
          offset: [0, 14],
        });
        marker.on("click", () => {
          onSelectRef.current(v.id);
          map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
        });
        cluster.addLayer(marker);
      });

    map.addLayer(cluster);
    renderVehIcons(); // pinta los SVG de lucide dentro de los divIcons
    cluster.on("animationend", renderVehIcons);

    // Encuadre inicial: solo la primera vez que hay datos. Después respetamos
    // el zoom/centro del usuario (los updates del socket no re-encuadran).
    if (!didFitRef.current) {
      const pts = vehicles.filter((v) => v.hasPosition).map((v) => [v.lat, v.lng]) as [number, number][];
      if (pts.length) {
        try {
          map.fitBounds(pts, { padding: [70, 70], maxZoom: 14 });
          didFitRef.current = true;
        } catch {
          /* bounds inválidos */
        }
      }
    }
  }, [vehicles]);

  function fit() {
    const map = mapRef.current;
    const pts = vehicles.filter((v) => v.hasPosition).map((v) => [v.lat, v.lng]) as [number, number][];
    if (map && pts.length) map.fitBounds(pts, { padding: [70, 70], maxZoom: 14 });
  }

  // Vuela al vehículo y lo selecciona (abre su card).
  function goToVehicle(v: Vehicle) {
    onSelect(v.id);
    if (v.hasPosition) {
      const map = mapRef.current;
      map?.flyTo([v.lat, v.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    }
    setPicker(false);
    setPickQuery("");
  }

  // Lista del picker: conectados primero, luego por nombre. Con filtro opcional.
  const statusRank: Record<StatusKey, number> = { connected: 0, unstable: 1, disconnected: 2 };
  const q = pickQuery.trim().toLowerCase();
  const pickList = [...vehicles]
    .sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name))
    .filter((v) => !q || v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.contact.toLowerCase().includes(q));

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;

  return (
    <div style={{ width: "100%", height: "100%", background: "#15171d", position: "relative", overflow: "hidden" }}>
      <div ref={elRef} style={{ position: "absolute", inset: 0, background: "#15171d", zIndex: 1 }} />

      {/* Backdrop: cierra el picker al tocar fuera */}
      {picker && (
        <div onClick={() => setPicker(false)} style={{ position: "absolute", inset: 0, zIndex: 550 }} />
      )}

      {/* Controles (arriba-derecha) */}
      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", gap: 8, zIndex: 600 }}>
        <div style={{ display: "flex", flexDirection: "column", background: "rgba(20,21,26,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", backdropFilter: "blur(12px)" }}>
          <button onClick={() => mapRef.current?.zoomIn()} style={ctrlBtn(true)}>
            <Icon name="plus" size={18} color="rgba(255,255,255,0.7)" />
          </button>
          <button onClick={() => mapRef.current?.zoomOut()} style={ctrlBtn(false)}>
            <Icon name="minus" size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>
        <button onClick={fit} style={{ ...ctrlBtnBase, background: "rgba(20,21,26,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, backdropFilter: "blur(12px)" }}>
          <Icon name="locate-fixed" size={18} color="#4f8ef7" />
        </button>
        <button
          onClick={() => setPicker((p) => !p)}
          style={{
            ...ctrlBtnBase,
            background: picker ? "rgba(79,142,247,0.18)" : "rgba(20,21,26,0.9)",
            border: `1px solid ${picker ? "rgba(79,142,247,0.45)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12,
            backdropFilter: "blur(12px)",
          }}
        >
          <Icon name="car" size={18} color="#4f8ef7" />
        </button>
      </div>

      {/* Panel "Ir a vehículo" */}
      {picker && (
        <div style={{ position: "absolute", top: 14, right: 62, width: 212, maxHeight: "calc(100% - 130px)", zIndex: 600, background: "rgba(20,21,26,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, backdropFilter: "blur(20px)", boxShadow: "0 12px 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            Ir a vehículo
          </div>
          {vehicles.length > 6 && (
            <div style={{ padding: "8px 8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "7px 10px" }}>
                <Icon name="search" size={13} color="rgba(255,255,255,0.35)" />
                <input
                  type="text"
                  value={pickQuery}
                  onChange={(e) => setPickQuery(e.target.value)}
                  placeholder="Buscar"
                  style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }}
                />
              </div>
            </div>
          )}
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            {pickList.map((v) => {
              const st = statusMap[v.status];
              const active = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  onClick={() => goToVehicle(v)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 9, border: "none", cursor: "pointer", outline: "none", textAlign: "left", background: active ? "rgba(79,142,247,0.12)" : "transparent" }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                  <Icon name={v.icon} size={15} color={active ? "#4f8ef7" : "rgba(255,255,255,0.55)"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{v.hasPosition ? (v.speed > 0 ? `${v.speed} km/h` : "Detenido") : "Sin posición"}</div>
                  </div>
                </button>
              );
            })}
            {pickList.length === 0 && (
              <div style={{ padding: "20px 10px", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Sin resultados</div>
            )}
          </div>
        </div>
      )}

      {/* Card flotante del vehículo seleccionado */}
      {selected && (
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 104,
            zIndex: 500,
            background: "rgba(20,21,26,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            padding: 14,
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            animation: "cardUp 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, marginTop: -4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: statusMap[selected.status].bg, border: `1px solid ${statusMap[selected.status].border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={selected.icon} size={20} color={statusMap[selected.status].color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>{selected.name}</span>
                <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 5 }}>{selected.contact || selected.plate}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusMap[selected.status].color }} />
                <span style={{ fontSize: 11, color: statusMap[selected.status].color, fontWeight: 600 }}>{statusMap[selected.status].label}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>· {selected.speed > 0 ? `${selected.speed} km/h` : "Detenido"}</span>
              </div>
            </div>
            <button onClick={() => onSelect(null)} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="x" size={15} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <Icon name="map-pin" size={13} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.location}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <Icon name="satellite" size={13} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Última señal GPS: {selected.gpsRelative}
              <span style={{ color: "rgba(255,255,255,0.3)" }}> · {selected.gpsAbsolute}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const ctrlBtnBase: React.CSSProperties = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  outline: "none",
};
function ctrlBtn(top: boolean): React.CSSProperties {
  return {
    ...ctrlBtnBase,
    background: "transparent",
    border: "none",
    borderBottom: top ? "1px solid rgba(255,255,255,0.08)" : "none",
  };
}

// Dibuja los íconos lucide dentro de los divIcons de Leaflet (que viven fuera
// del árbol React). Usa renderToStaticMarkup de los SVG de lucide.
function renderVehIcons() {
  document.querySelectorAll<HTMLElement>("[data-veh-icon]").forEach((el) => {
    if (el.dataset.painted) return;
    const name = el.getAttribute("data-veh-icon") || "car";
    el.innerHTML = renderToStaticMarkup(
      <Icon name={name} size={17} color={el.style.color || "#fff"} />,
    );
    el.dataset.painted = "1";
  });
}
