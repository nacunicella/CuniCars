import { useEffect, useMemo, useState } from "react";
import TopBar from "./views/TopBar";
import BottomDock, { type TabKey } from "./views/BottomDock";
import MapTab from "./views/MapTab";
import ListTab from "./views/ListTab";
import AlertsTab from "./views/AlertsTab";
import RouteTab from "./views/RouteTab";
import SettingsTab from "./views/SettingsTab";
import ErrorBoundary from "./ui/ErrorBoundary";
import { useLiveSocket } from "./api/useLiveSocket";
import { getDevices, getPositions, getSession, login, logout } from "./api/traccar";
import { clearCreds, getServerUrl, loadCreds, refreshBaseUrl, saveCreds, setServerUrl } from "./api/client";
import { buildVehicles, toAlert } from "./lib/vehicles";
import type { TileKey } from "./theme";
import type { Device, Position, TraccarUser } from "./types/traccar";

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

  const live = useLiveSocket(!!user);

  // Sesión activa al cargar. Si la cookie ya no está (la app se cerró), se
  // re-loguea solo con las credenciales guardadas.
  useEffect(() => {
    (async () => {
      let u = await getSession();
      if (!u) {
        const creds = loadCreds();
        if (creds) {
          try {
            u = await login(creds.email, creds.password);
          } catch {
            /* credenciales inválidas o sin red */
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
    }
  }, [user]);

  function loadSnapshot() {
    getDevices().then((ds) => setSeedDevices(Object.fromEntries(ds.map((d) => [d.id, d]))));
    getPositions().then((ps) => setSeedPositions(Object.fromEntries(ps.map((p) => [p.deviceId, p]))));
  }

  const devices = useMemo(() => ({ ...seedDevices, ...live.devices }), [seedDevices, live.devices]);
  const positions = useMemo(() => ({ ...seedPositions, ...live.positions }), [seedPositions, live.positions]);
  const vehicles = useMemo(() => buildVehicles(devices, positions), [devices, positions]);
  const alerts = useMemo(() => live.events.map((e) => toAlert(e, devices)), [live.events, devices]);

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
      saveCreds(email, password); // para re-login automático tras cerrar la app
      setUser(u);
      setTab("map");
    } catch {
      setConnectError("No se pudo conectar. Revisá URL, usuario y contraseña.");
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
    clearCreds(); // no re-loguear automático tras desconectar a propósito
    setUser(null);
    setSelectedId(null);
    setTab("settings");
  }

  function handleRefresh() {
    if (refreshing || !user) return;
    setRefreshing(true);
    live.reconnect(); // reabre el WebSocket
    loadSnapshot(); // re-baja devices + positions por REST
    setTimeout(() => setRefreshing(false), 1000);
  }

  function showOnMap(id: number) {
    setSelectedId(id);
    setTab("map");
  }

  return (
    <div style={{ width: "100%", height: "100vh", background: "#0d0d0f", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", fontFamily: "'Space Grotesk',sans-serif" }}>
        <TopBar refreshing={refreshing} onRefresh={handleRefresh} />

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
