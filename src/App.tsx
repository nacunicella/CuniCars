import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "./views/TopBar";
import BottomDock, { type TabKey } from "./views/BottomDock";
import MapTab from "./views/MapTab";
import ListTab from "./views/ListTab";
import AlertsTab from "./views/AlertsTab";
import RouteTab from "./views/RouteTab";
import SettingsTab from "./views/SettingsTab";
import ErrorBoundary from "./ui/ErrorBoundary";
import { useLiveSocket } from "./api/useLiveSocket";
import { createToken, getDevices, getEventsFor, getPositions, getSession, login, loginWithToken, logout } from "./api/traccar";
import { clearToken, getServerUrl, loadToken, purgeLegacyCreds, refreshBaseUrl, saveToken, setServerUrl } from "./api/client";
import { buildVehicles, toAlert } from "./lib/vehicles";
import { describeError, nativeProbe } from "./lib/diag";
import type { TileKey } from "./theme";
import type { Device, Position, TraccarEvent, TraccarUser } from "./types/traccar";

const MAP_KEY = "cunicars_map";

export default function App() {
  const [tab, setTab] = useState<TabKey>("map");
  const [user, setUser] = useState<TraccarUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [tileKey, setTileKey] = useState<TileKey>(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(MAP_KEY)) as TileKey | null;
    return saved ?? "sat";
  });

  const [seedDevices, setSeedDevices] = useState<Record<number, Device>>({});
  const [seedPositions, setSeedPositions] = useState<Record<number, Position>>({});
  const [seedEvents, setSeedEvents] = useState<TraccarEvent[]>([]);

  const live = useLiveSocket(!!user);

  // Los tiempos relativos ("hace 5 min") y el estado "sin señal GPS" dependen
  // de la hora actual. Sin este tick, en la web se congelan hasta que llegue un
  // mensaje del WebSocket: con la flota detenida de noche, la app puede mostrar
  // "hace 3 min" durante una hora.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Sesión activa al cargar. Si la cookie ya no está (la app se cerró), se
  // reabre con el token guardado.
  useEffect(() => {
    purgeLegacyCreds(); // borra la contraseña que guardaban versiones viejas
    (async () => {
      let u: TraccarUser | null = null;
      try {
        u = await getSession();
      } catch (e) {
        setConnectError(`No se pudo contactar al servidor: ${describeError(e)}`);
      }
      if (!u) {
        const token = loadToken();
        if (token) {
          try {
            u = await loginWithToken(token);
          } catch {
            clearToken(); // token vencido o revocado
          }
        }
      }
      setUser(u);
      setBooting(false);
      if (!u) setTab("settings");
    })();
  }, []);

  // Snapshot inicial al autenticar.
  useEffect(() => {
    if (user) loadSnapshot();
    else {
      setSeedDevices({});
      setSeedPositions({});
      setSeedEvents([]);
    }
  }, [user]);

  // Cada invocación invalida a la anterior: sin esto, un snapshot en vuelo al
  // momento de desconectar repuebla el mapa ya deslogueado.
  const snapshotGen = useRef(0);

  async function loadSnapshot(): Promise<void> {
    const gen = ++snapshotGen.current;
    const vigente = () => gen === snapshotGen.current;
    try {
      const [ds, ps] = await Promise.all([getDevices(), getPositions()]);
      if (!vigente()) return;
      setSeedDevices(Object.fromEntries(ds.map((d) => [d.id, d])));
      setSeedPositions(Object.fromEntries(ps.map((p) => [p.deviceId, p])));
      loadEvents(ds.map((d) => d.id), gen);
    } catch (e) {
      if (vigente()) setConnectError(`No se pudieron actualizar los datos: ${describeError(e)}`);
    }
  }

  // Alertas de las últimas 24 h. Sin esto la pestaña arranca vacía cada vez y
  // solo muestra los eventos que llegan mientras la app está abierta.
  function loadEvents(deviceIds: number[], gen: number) {
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - 24 * 60 * 60 * 1000);
    getEventsFor(deviceIds, desde.toISOString(), hasta.toISOString())
      .then((evs) => {
        if (gen === snapshotGen.current) setSeedEvents(evs);
      })
      .catch(() => {
        /* las alertas son secundarias: que fallen no rompe el resto */
      });
  }

  // El feed vivo y el snapshot REST pueden traer versiones distintas del mismo
  // dato. Antes ganaba siempre el vivo por ser el vivo: si el WebSocket quedaba
  // con una posición vieja, tocar "Actualizar" bajaba la nueva y el vivo la
  // pisaba. Ahora gana la más reciente.
  const devices = useMemo(
    () => mergeNewer(seedDevices, live.devices, (d) => Date.parse(d.lastUpdate ?? "") || 0),
    [seedDevices, live.devices],
  );
  const positions = useMemo(
    () => mergeNewer(seedPositions, live.positions, (p) => Date.parse(p.fixTime) || p.id),
    [seedPositions, live.positions],
  );
  const vehicles = useMemo(() => buildVehicles(devices, positions, ahora), [devices, positions, ahora]);
  const alerts = useMemo(() => {
    const porId = new Map<number, TraccarEvent>();
    for (const e of [...live.events, ...seedEvents]) porId.set(e.id, e);
    return [...porId.values()]
      .sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime))
      .map((e) => toAlert(e, devices, ahora));
  }, [live.events, seedEvents, devices, ahora]);

  function selectTile(key: TileKey) {
    setTileKey(key);
    try {
      localStorage.setItem(MAP_KEY, key);
    } catch {
      /* ignore */
    }
  }

  async function handleConnect(url: string, email: string, password: string) {
    setConnecting(true);
    setConnectError(null);
    try {
      if (url) {
        setServerUrl(url);
        refreshBaseUrl();
      }
      const u = await login(email, password);
      // Para reabrir sesión más adelante guardamos un token del servidor, no la
      // contraseña. Si el servidor no lo emite, no persistimos nada.
      try {
        const token = await createToken();
        if (token) saveToken(token);
      } catch {
        clearToken();
      }
      setUser(u);
      setTab("map");
    } catch (e) {
      // Mostrar la causa real: sin esto, un fallo de red, un 401 y un
      // certificado rechazado se ven todos igual.
      const probe = await nativeProbe();
      setConnectError(`No se pudo conectar: ${describeError(e)}${probe ? ` · ${probe}` : ""}`);
    } finally {
      setConnecting(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    clearToken(); // no reabrir sesión sola tras desconectar a propósito
    snapshotGen.current++; // invalida cualquier snapshot en vuelo
    setUser(null);
    setSelectedId(null);
    setTab("settings");
  }

  async function handleRefresh() {
    if (refreshing || !user) return;
    setRefreshing(true);
    setConnectError(null);
    live.reconnect(); // reabre el WebSocket / fuerza un poll
    await loadSnapshot(); // re-baja devices + positions por REST
    setRefreshing(false);
  }

  function showOnMap(id: number) {
    setSelectedId(id);
    setTab("map");
  }

  return (
    <div style={{ width: "100%", height: "100dvh", background: "#0d0d0f", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", fontFamily: "'Space Grotesk',sans-serif" }}>
        <TopBar refreshing={refreshing} connected={live.connected} hasUser={!!user} onRefresh={handleRefresh} />

        <ErrorBoundary>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {booting && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              Cargando…
            </div>
          )}

          {/* Mapa se mantiene montado para no recrear Leaflet en cada cambio de tab */}
          <div style={{ position: "absolute", inset: 0, visibility: tab === "map" ? "visible" : "hidden" }}>
            <MapTab vehicles={vehicles} tileKey={tileKey} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          {tab === "list" && <ListTab vehicles={vehicles} onShowOnMap={showOnMap} />}
          {tab === "alert" && <AlertsTab alerts={alerts} />}
          {tab === "route" && <RouteTab vehicles={vehicles} tileKey={tileKey} />}
          {tab === "settings" && (
            <SettingsTab
              user={user}
              serverUrl={getServerUrl()}
              connecting={connecting}
              error={connectError}
              tileKey={tileKey}
              onConnect={handleConnect}
              onLogout={handleLogout}
              onTileChange={selectTile}
            />
          )}
        </div>
        </ErrorBoundary>

        <BottomDock active={tab} alertCount={alerts.length} onSelect={setTab} />
      </div>
    </div>
  );
}

// Combina el snapshot REST con el feed vivo quedándose con el dato más reciente
// de cada id, según la marca de tiempo que devuelve `stamp`.
function mergeNewer<T>(
  seed: Record<number, T>,
  live: Record<number, T>,
  stamp: (v: T) => number,
): Record<number, T> {
  const out: Record<number, T> = { ...seed };
  for (const [key, valor] of Object.entries(live)) {
    const id = Number(key);
    const previo = out[id];
    if (!previo || stamp(valor) >= stamp(previo)) out[id] = valor;
  }
  return out;
}
