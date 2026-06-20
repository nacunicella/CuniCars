import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import Icon from "../ui/Icon";
import { statusMap, tileDefs, type TileKey } from "../theme";
import { getRoute } from "../api/traccar";
import type { Position } from "../types/traccar";
import type { Vehicle } from "../lib/vehicles";
import { haversineKm, hhmm, knotsToKmh, kmLabel, durationLabel } from "../lib/format";

interface Props {
  vehicles: Vehicle[];
  tileKey: TileKey;
}

// Opciones de fecha: hoy, ayer y dos días previos con etiqueta de día.
function dateOptions() {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const out: { key: string; label: string; date: Date }[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const label = i === 0 ? "Hoy" : i === 1 ? "Ayer" : `${days[d.getDay()]} ${d.getDate()}`;
    out.push({ key: d.toISOString().slice(0, 10), label, date: d });
  }
  return out;
}

function dayRange(dayKey: string): { from: string; to: string } {
  const start = new Date(`${dayKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const now = new Date();
  return { from: start.toISOString(), to: (end < now ? end : now).toISOString() };
}

export default function RouteTab({ vehicles, tileKey }: Props) {
  const dates = useMemo(dateOptions, []);
  const [vehId, setVehId] = useState<number | null>(vehicles[0]?.id ?? null);
  const [dayKey, setDayKey] = useState(dates[0].key);
  const [customDate, setCustomDate] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  // Si aún no hay vehículo elegido pero ya llegaron, tomar el primero.
  useEffect(() => {
    if (vehId == null && vehicles.length) setVehId(vehicles[0].id);
  }, [vehicles, vehId]);

  // Fetch del recorrido cuando cambia vehículo o fecha.
  useEffect(() => {
    if (vehId == null) return;
    const key = customDate || dayKey;
    const { from, to } = dayRange(key);
    let cancel = false;
    setLoading(true);
    getRoute(vehId, from, to)
      .then((ps) => {
        if (!cancel) {
          setPositions(ps);
          setStep(0);
        }
      })
      .catch(() => !cancel && setPositions([]))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [vehId, dayKey, customDate]);

  const path = useMemo(
    () => positions.map((p) => [p.latitude, p.longitude] as [number, number]),
    [positions],
  );

  const stats = useMemo(() => {
    if (positions.length < 2) return { distance: "0 km", duration: "0 min", title: "" };
    let dist = 0;
    for (let i = 1; i < path.length; i++) dist += haversineKm(path[i - 1], path[i]);
    const ms = new Date(positions[positions.length - 1].fixTime).getTime() - new Date(positions[0].fixTime).getTime();
    return { distance: kmLabel(dist), duration: durationLabel(ms), title: `${hhmm(positions[0].fixTime)} – ${hhmm(positions[positions.length - 1].fixTime)}` };
  }, [positions, path]);

  const scrubIdx = positions.length ? Math.round((step / 100) * (positions.length - 1)) : 0;
  const scrubPos = positions[scrubIdx];
  const scrubTime = scrubPos ? hhmm(scrubPos.fixTime) : "--:--";
  const scrubSpeed = scrubPos ? (knotsToKmh(scrubPos.speed) === 0 ? "Detenido" : `${knotsToKmh(scrubPos.speed)} km/h`) : "0 km/h";

  // ── Mapa ──
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const scrubMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true, maxZoom: 20 }).setView([-34.62, -58.41], 12);
    mapRef.current = map;
    const def = tileDefs[tileKey] ?? tileDefs.carto;
    L.tileLayer(def.url, def.opts).addTo(map);
    setTimeout(() => map.invalidateSize(), 80);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Dibuja la ruta.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    scrubMarkerRef.current = null;
    if (path.length < 2) return;

    const line = L.polyline(path, { color: "#4f8ef7", weight: 4, opacity: 0.95 }).addTo(map);
    layersRef.current.push(line);
    const dot = (color: string) =>
      L.divIcon({
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>`,
        className: "cuni-marker",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
    layersRef.current.push(L.marker(path[0], { icon: dot("#22c55e") }).addTo(map));
    layersRef.current.push(L.marker(path[path.length - 1], { icon: dot("#4f8ef7") }).addTo(map));
    setTimeout(() => {
      try {
        map.fitBounds(line.getBounds(), { paddingTopLeft: [45, 45], paddingBottomRight: [45, 150], maxZoom: 15 });
      } catch {
        /* noop */
      }
    }, 100);
  }, [path]);

  // Marcador del scrubber.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !scrubPos) return;
    const ll: [number, number] = [scrubPos.latitude, scrubPos.longitude];
    if (!scrubMarkerRef.current) {
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #4f8ef7;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
        className: "cuni-marker",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      scrubMarkerRef.current = L.marker(ll, { icon, zIndexOffset: 100 }).addTo(map);
    } else {
      scrubMarkerRef.current.setLatLng(ll);
    }
  }, [scrubIdx, scrubPos]);

  const label = "font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Selectores */}
      <div style={{ padding: "14px 14px 12px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ ...cssText(label), marginBottom: 8, paddingLeft: 2 }}>Vehículo</p>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
          {vehicles.map((v) => {
            const active = vehId === v.id;
            const st = statusMap[v.status];
            return (
              <button
                key={v.id}
                onClick={() => setVehId(v.id)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 11, border: `1px solid ${active ? "rgba(79,142,247,0.3)" : "rgba(255,255,255,0.08)"}`, background: active ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.04)", cursor: "pointer", outline: "none", whiteSpace: "nowrap" }}
              >
                <Icon name={v.icon} size={15} color={active ? st.color : "rgba(255,255,255,0.4)"} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>{v.name}</span>
                {(v.contact || v.plate) && (
                  <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>{v.contact || v.plate}</span>
                )}
              </button>
            );
          })}
        </div>

        <p style={{ ...cssText(label), marginBottom: 8, paddingLeft: 2 }}>Fecha</p>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2, alignItems: "center" }}>
          {dates.map((d) => {
            const active = dayKey === d.key && !customDate;
            return (
              <button
                key={d.key}
                onClick={() => {
                  setDayKey(d.key);
                  setCustomDate("");
                }}
                style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 11, border: `1px solid ${active ? "rgba(79,142,247,0.3)" : "rgba(255,255,255,0.08)"}`, background: active ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.04)", color: active ? "#4f8ef7" : "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", outline: "none", whiteSpace: "nowrap" }}
              >
                {d.label}
              </button>
            );
          })}
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{ padding: "8px 13px", borderRadius: 11, border: `1px solid ${customDate ? "rgba(79,142,247,0.3)" : "rgba(255,255,255,0.08)"}`, background: customDate ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.04)", color: customDate ? "#4f8ef7" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", outline: "none", cursor: "pointer", colorScheme: "dark", minWidth: 44 }}
          />
        </div>
      </div>

      {/* Mapa de la ruta */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div ref={elRef} style={{ position: "absolute", inset: 0, background: "#15171d", zIndex: 1 }} />

        {/* Card stats + scrubber */}
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 104, zIndex: 500, background: "rgba(20,21,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "14px 16px", backdropFilter: "blur(20px)", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, marginTop: -4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              {loading ? "Cargando…" : positions.length < 2 ? "Sin recorrido" : stats.title}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="route" size={13} color="#4f8ef7" />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{stats.distance}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="clock" size={13} color="rgba(255,255,255,0.35)" />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{stats.duration}</span>
              </div>
            </div>
          </div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type="range"
              min={0}
              max={100}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              style={{ width: "100%", height: 4, borderRadius: 2, WebkitAppearance: "none", appearance: "none", background: `linear-gradient(to right, #4f8ef7 ${step}%, rgba(255,255,255,0.15) ${step}%)`, outline: "none", cursor: "pointer" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="clock-3" size={12} color="rgba(255,255,255,0.35)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600, fontFamily: "'Space Mono',monospace" }}>{scrubTime}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="gauge" size={12} color="rgba(255,255,255,0.35)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{scrubSpeed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Parsea un string CSS "prop:val;prop:val;" a objeto de estilo React (para los labels).
function cssText(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  css.split(";").forEach((decl) => {
    const [k, v] = decl.split(":");
    if (!k || !v) return;
    const key = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = v.trim();
  });
  return out as React.CSSProperties;
}
